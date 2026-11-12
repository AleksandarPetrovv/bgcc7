import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { stages } from "./schema";
import { getPoolStages, poolGaps, slotOf, slotsOf } from "./mappools";
import { getSkillLayouts } from "./format-plan";
import { matchWeeks } from "./schedule";
import { getFormat } from "./edition";
import { notifyHosts } from "./host-notes";
import { getMatchRows, getTeams } from "./tournament";
import { later, postPool, postPoolClosed, postPoolOpen, postPoolReminder } from "./discord-bot";
import { isBlocked, placeSuggestion, slotLeader } from "./pool-sheet";
import { poolAccess, poolWindows } from "@/lib/pool-window";
import { skillSlot } from "@/lib/format-plan";
import { globalStore } from "@/lib/global-store";
import { packJob, startPackJob } from "@/lib/pack-builder";
import { dicts, roundName } from "@/lib/i18n/dict";
import { osuMap } from "@/lib/links";
import { can, type Role } from "@/lib/roles";

const t = dicts.en;

export async function poolState(now = Date.now()) {
  const [weeks, ss] = await Promise.all([matchWeeks(), db.select({ slug: stages.slug, settledAt: stages.settledAt }).from(stages)]);
  const ws = poolWindows(getFormat().rounds, weeks);
  const settled = new Set(ss.filter((s) => s.settledAt).map((s) => s.slug));
  return { now, ws, settled, access: poolAccess(ws, settled, now) };
}

type Who = { osuId: number; roles: readonly Role[] | null | undefined };

/** poolers and testers whose own team is still in the tournament never see the sheet (their next pool could be theirs); hosts never blocked, nobody before the draw */
export async function sheetBlocked({ osuId, roles }: Who) {
  if (!can(roles, "mappools") || can(roles, "host")) return false;
  const [teams, rows] = await Promise.all([getTeams(), getMatchRows()]);
  return isBlocked(teams, rows, osuId);
}

// settleStage runs once at a time per stage: a slow run must not be started again by the next minute's tick
const settling = globalStore("poolSettling", () => new Set<string>());

/** the deadline: every slot's leader goes into the pool; ties, empty slots and a map already in another slot wait for a host. full and clean = the pack is built too.
 *  settledAt is written once the slots are placed, so a crash before that retries on the next tick (placing is idempotent) */
export async function settleStage(slug: string) {
  if (settling.has(slug)) return;
  settling.add(slug);
  try {
    const [stage] = (await getPoolStages()).filter((s) => s.slug === slug);
    if (!stage) return;
    const layout = (await getSkillLayouts())?.[slug];
    const label = (mod: string, slot: number) => skillSlot(layout, mod, slot)?.label ?? slotOf(mod, slot);
    const name = roundName(t, stage.title);
    let placed = 0;
    const replaced: string[] = [];
    const stuck: string[] = [];
    for (const { mod, slot } of slotsOf(stage.blueprint)) {
      const lead = await slotLeader(stage.id, mod, slot);
      if (lead.kind !== "win") {
        stuck.push(lead.kind === "tie" ? t.admin.pf.tie(label(mod, slot)) : t.admin.pf.empty(label(mod, slot)));
        continue;
      }
      const r = await placeSuggestion(lead.s);
      if (r === "dupe") {
        stuck.push(t.admin.pf.dupe(label(mod, slot)));
        continue;
      }
      // a leader already in its slot (a retry after a crash) still counts as settled
      placed++;
      if (r !== "same" && r.replaced) replaced.push(t.admin.pf.replaced(label(mod, slot), osuMap(r.replaced.beatmapId)));
    }
    await db.update(stages).set({ settledAt: new Date() }).where(eq(stages.id, stage.id));
    later("pool closed", () => postPoolClosed(slug, stage.title));
    await notifyHosts({ title: t.admin.pf.settled(placed, name), lines: replaced, href: `/admin/mappools?stage=${slug}` });
    if (stuck.length) {
      await notifyHosts({ title: t.admin.pf.stuck(name), lines: stuck, href: `/admin/mappools/sheet?stage=${slug}` });
      await poolChanged(stage.id);
    } else buildPack(stage, false);
  } finally {
    settling.delete(slug);
  }
}

type Round = { id: number; slug: string; title: string };
// one background build per stage; an edit during a build makes it run once more afterwards, so the last edit wins
const builds = globalStore("poolBuilds", () => new Map<string, { again: boolean }>());

// a pack build runs in the background; tell the hosts if it fails, or (after a map change on a released pool) when it's rebuilt
function buildPack(stage: Round, tell: boolean) {
  const run = builds.get(stage.slug);
  if (run) {
    run.again = true;
    return;
  }
  builds.set(stage.slug, { again: false });
  startPackJob(stage.slug, 0);
  const watch = setInterval(() => {
    const j = packJob(stage.slug);
    if (j?.state === "running") return;
    if (builds.get(stage.slug)?.again) {
      builds.set(stage.slug, { again: false });
      startPackJob(stage.slug, 0);
      return;
    }
    clearInterval(watch);
    builds.delete(stage.slug);
    const name = roundName(t, stage.title);
    const href = `/admin/mappools?stage=${stage.slug}`;
    if (j?.state === "error") void notifyHosts({ title: t.admin.pf.packFailed(name), href });
    else if (tell) void notifyHosts({ title: t.admin.pf.rebuilt(name), href });
  }, 10_000);
}

/** after a pool's maps changed (the pack is already cleared): a released, full pool gets its pack rebuilt in the background */
export async function poolChanged(stageId: number) {
  const g = await poolGaps(stageId);
  if (g?.released && g.full && g.noPack) buildPack(g, true);
}

/** a host released a pool: it is public on the site either way; hosts hear what is missing, and discord is announced as soon as it is complete */
export async function poolReleased(stageId: number) {
  const g = await poolGaps(stageId);
  if (!g) return;
  // a full pool only lacks its pack: build it, the announcement follows the build
  if (g.full && g.noPack) buildPack(g, false);
  else if (!g.ok) {
    const name = roundName(t, g.title);
    const lines = [...(g.empty.length ? [t.admin.pf.missingSlots(g.empty.join(", "))] : []), ...(g.noPack ? [t.admin.pf.missingPack] : [])];
    await notifyHosts({ title: t.admin.pf.heldBack(name), lines, href: `/admin/mappools?stage=${g.slug}` });
  }
  later("pool", () => postPool(stageId));
}

// shortcut: in memory, so a restart may retry one pack build per window; fine since a pack only builds while it's missing
const checked = new Set<string>();

/** every minute: settle pools whose deadline passed (catches up after downtime), ping the staff channel once for the window that is open
 *  (and again 24 hours before it closes)
 *  (also one that opened while the site was down), and once a new window opens, build the pack of any released, full pool that has none */
export async function poolTick() {
  const now = Date.now();
  const { ws, settled, access } = await poolState(now);
  for (const w of ws) if (now >= w.closes.getTime() && !settled.has(w.stage)) await settleStage(w.stage);
  if (access.open) {
    const { stage, closes } = access.open;
    const title = (await getPoolStages()).find((s) => s.slug === stage)?.title;
    if (title) {
      later("pool open", () => postPoolOpen(stage, title, closes));
      if (closes.getTime() - now <= 24 * 3600_000) later("pool reminder", () => postPoolReminder(stage, title, closes));
    }
  }
  const opened = ws.filter((w) => w.opens.getTime() <= now).at(-1);
  if (!opened || checked.has(opened.stage)) return;
  checked.add(opened.stage);
  for (const s of await getPoolStages()) {
    const g = await poolGaps(s.id);
    if (g?.released && g.full && g.noPack) buildPack(g, false);
  }
}

/** admin menu sections a viewer loses: the sheet, for poolers and testers, once the last pool settled or while their own team is still playing */
export async function menuHidden(who: Who): Promise<"mappools"[]> {
  if (!can(who.roles, "mappools") || can(who.roles, "host")) return [];
  return (await poolState()).access.done || (await sheetBlocked(who)) ? ["mappools"] : [];
}

/** after a host moved a match week past a pool's deadline: settle those pools now, or (skip) just close them unsettled */
export async function settleLate(settle: boolean) {
  const now = Date.now();
  const { ws, settled } = await poolState(now);
  for (const w of ws.filter((x) => x.closes.getTime() <= now && !settled.has(x.stage))) {
    if (settle) await settleStage(w.stage);
    else await db.update(stages).set({ settledAt: new Date() }).where(eq(stages.slug, w.stage));
  }
}
