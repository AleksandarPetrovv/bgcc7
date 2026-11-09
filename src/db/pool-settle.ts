import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { stages } from "./schema";
import { getPoolStages, slotOf, slotsOf } from "./mappools";
import { getSkillLayouts } from "./format-plan";
import { matchWeeks } from "./schedule";
import { getSettings } from "./settings";
import { getFormat } from "./edition";
import { notifyHosts } from "./host-notes";
import { placeSuggestion, slotLeader } from "./pool-sheet";
import { poolAccess, poolWindows } from "@/lib/pool-window";
import { skillSlot } from "@/lib/format-plan";
import { packJob, startPackJob } from "@/lib/pack-builder";
import { dicts, roundName } from "@/lib/i18n/dict";
import { osuMap } from "@/lib/links";
import { can, type Role } from "@/lib/roles";

const t = dicts.en;

export async function poolState(now = Date.now()) {
  const [weeks, ss, settings] = await Promise.all([matchWeeks(), db.select({ slug: stages.slug, settledAt: stages.settledAt }).from(stages), getSettings()]);
  const ws = poolWindows(getFormat().rounds, weeks);
  const settled = new Set(ss.filter((s) => s.settledAt).map((s) => s.slug));
  return { now, ws, settled, access: poolAccess(ws, settled, settings.phase === "playoffs" || settings.phase === "finished", now) };
}

/** the deadline: every slot's leader goes into the pool; ties and empty slots wait for a host. full and clean = the pack is built too */
export async function settleStage(slug: string) {
  const [stage] = (await getPoolStages()).filter((s) => s.slug === slug);
  if (!stage) return;
  await db.update(stages).set({ settledAt: new Date() }).where(eq(stages.id, stage.id));
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
    if (!r) continue;
    placed++;
    if (r.replaced) replaced.push(t.admin.pf.replaced(label(mod, slot), osuMap(r.replaced.beatmapId)));
  }
  await notifyHosts({ title: t.admin.pf.settled(placed, name), lines: replaced, href: `/admin/mappools?stage=${slug}` });
  if (stuck.length) await notifyHosts({ title: t.admin.pf.stuck(name), lines: stuck, href: `/admin/mappools/sheet?stage=${slug}` });
  else buildPack(slug, name);
}

// a pack build runs in the background; tell the hosts only if it fails
function buildPack(slug: string, name: string) {
  startPackJob(slug, 0);
  const watch = setInterval(() => {
    const j = packJob(slug);
    if (j?.state === "running") return;
    clearInterval(watch);
    if (j?.state === "error") void notifyHosts({ title: t.admin.pf.packFailed(name), href: `/admin/mappools?stage=${slug}` });
  }, 10_000);
}

// shortcut: in memory, so a restart may retry one pack build per window; fine since a pack only builds while it's missing
const checked = new Set<string>();

/** every minute: settle pools whose deadline passed (catches up after downtime), and once a new window opens,
 *  build the pack of any released, full pool that has none */
export async function poolTick() {
  const now = Date.now();
  const { ws, settled } = await poolState(now);
  for (const w of ws) if (now >= w.closes.getTime() && !settled.has(w.stage)) await settleStage(w.stage);
  const opened = ws.filter((w) => w.opens && w.opens.getTime() <= now).at(-1);
  if (!opened || checked.has(opened.stage)) return;
  checked.add(opened.stage);
  for (const s of await getPoolStages()) {
    const full = slotsOf(s.blueprint).every(({ mod, slot }) => s.pools.some((p) => p.category === mod && p.maps.some((m) => m.order === slot)));
    if (s.released && full && !s.pack && slotsOf(s.blueprint).length) buildPack(s.slug, roundName(t, s.title));
  }
}

/** admin menu sections a viewer loses: the sheet, for poolers and testers, once the last pool settled */
export async function menuHidden(roles: readonly Role[] | null | undefined): Promise<"mappools"[]> {
  if (!can(roles, "mappools") || can(roles, "host")) return [];
  return (await poolState()).access.done ? ["mappools"] : [];
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
