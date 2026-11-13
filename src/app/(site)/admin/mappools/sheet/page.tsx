import { Fragment } from "react";
import { forbidden } from "next/navigation";
import { Check, Hourglass, Trash2 } from "lucide-react";
import { LinkTabs } from "@/components/site/tabs";
import { DrawNote } from "@/components/site/draw/draw-stage";
import { ActionForm, IconAction } from "@/components/admin/form";
import { earlierMapIds, getPoolStages } from "@/db/mappools";
import { getPlan, getSkillLayouts } from "@/db/format-plan";
import { subcategoryNames } from "@/lib/format-plan";
import { TagChips } from "../tag-chips";
import { getSheet, sheetVersion } from "@/db/pool-sheet";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { poolState, sheetBlocked } from "@/db/pool-settle";
import { dayTime, toSofiaInput } from "@/lib/time";
import { PoolClock } from "./pool-clock";
import { can } from "@/lib/roles";
import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { pickIntoPool, pickSuggestion, removeSuggestion, suggestMap } from "./actions";
import { VoteCell } from "./vote-cell";
import { SlotPop } from "../slot-pop";
import { SheetView, SlotBox } from "./sheet-view";
import { cardCover } from "@/lib/data";
import { MapMeta, ModChip } from "../map-meta";
import { roundName } from "@/lib/i18n/dict";
import { MOD_ORDER, MODS } from "@/lib/mods";

const places = (items: { picked: boolean; pts: number | null }[]) => {
  const out: number[] = [];
  items.forEach((m, i) => {
    const prev = items[i - 1];
    out.push(i === 0 ? 1 : prev.picked !== m.picked || prev.pts === null || m.pts === null || prev.pts !== m.pts ? out[i - 1] + 1 : out[i - 1]);
  });
  return out;
};

export default async function PoolSheet({ searchParams }: PageProps<"/admin/mappools/sheet">) {
  const [t, lang, viewer, stages, sp, { now: at, ws, access }] = await Promise.all([getDict(), getLang(), getViewer(), getPoolStages(), searchParams, poolState()]);
  if (!viewer || !can(viewer.roles, "mappools")) forbidden();
  if (await sheetBlocked(viewer)) return <DrawNote>{t.admin.pf.teamIn}</DrawNote>;
  const host = can(viewer.roles, "host");
  // poolers and testers reach one stage at a time, inside its window; after the last pool settles, nothing
  if (!host && access.done) forbidden();
  const open = access.open?.stage;
  const reach = (slug: string) => host || slug === open;
  const name = (s: { title: string }) => roundName(t, s.title);
  const when = (d: Date) => dayTime(toSofiaInput(d), lang);
  if (!host && !open) {
    const next = stages.find((s) => s.slug === access.next?.stage);
    const opens = access.next?.opens;
    return next ? <PoolClock big title={t.admin.pf.nextIn(name(next))} when={opens ? when(opens) : ""} to={opens?.getTime() ?? null} at={at} /> : <DrawNote>{t.admin.pf.noWindow}</DrawNote>;
  }
  const stage = stages.find((s) => s.slug === (host ? sp.stage : open)) ?? (host ? stages[0] : undefined);
  if (!stage) return null;
  const win = access.open?.stage === stage.slug ? ws.find((w) => w.stage === stage.slug) : undefined;
  const edit = can(viewer.roles, "poolEdit");
  const vote = can(viewer.roles, "poolVote");
  const [sheets, version, layouts, plan, earlier] = await Promise.all([Promise.all(stages.map((s) => getSheet(s.id, viewer.osuId, s.blueprint))), sheetVersion(stage.id), getSkillLayouts(), getPlan(), earlierMapIds(stage.id)]);
  const sheet = sheets[stages.indexOf(stage)];
  const skill = layouts?.[stage.slug];
  const info = new Map(skill?.groups.flatMap((g, gi) => g.slots.map((x, k) => [`${x.mod}-${x.slot}`, { group: g, label: x.label, ids: x.ids, at: gi * 100 + k }] as const)) ?? []);
  const unset = (s: (typeof sheet.slots)[number]) => {
    const win = s.items.find((x) => x.picked);
    return !!win && stage.pools.find((p) => p.category === s.mod)?.maps.find((m) => m.order === s.slot)?.id !== win.beatmapId;
  };
  // the map each slot would get right now: the decided one, else the one leading on points
  const won = sheet.slots.filter((s) => !s.out && s.items[0] && (s.picked || s.items[0].pts !== null)).map((s) => s.items[0]);
  const slots = skill ? [...sheet.slots].sort((a, b) => (info.get(`${a.mod}-${a.slot}`)?.at ?? 1e6) - (info.get(`${b.mod}-${b.slot}`)?.at ?? 1e6)) : sheet.slots;

  // the round tabs stay mounted; everything under them is keyed by stage so it plays its intro again
  return (
    <>
      <LinkTabs
        className="in-left mb-6 [--d:0.15s]"
        label={t.admin.menu.mappools}
        items={stages.map((s) => ({
          href: `/admin/mappools/sheet?stage=${s.slug}`,
          active: s.id === stage.id,
          disabled: !reach(s.slug),
          label: name(s),
        }))}
      />

      <Fragment key={stage.slug}>
      {sheet.slots.length === 0 && <p className="in-up border-y border-line py-4 text-sm text-ash [--d:0.3s]">{t.admin.noLayout}</p>}

      <SheetView
        key={stage.id}
        stageId={stage.id}
        version={version}
        clock={win && <PoolClock title={t.admin.pf.until} when={when(win.closes)} to={win.closes.getTime()} at={at} />}
        order={slots.map((s) => info.get(`${s.mod}-${s.slot}`)?.group.id ?? s.mod)}
        sr={{ target: plan.rounds.find((r) => r.slug === stage.slug)?.sr ?? null, now: won.length ? won.reduce((n, m) => n + m.sr, 0) / won.length : null }}
        mods={
          skill
            ? skill.groups.map((g) => ({ key: g.id, short: g.name, color: g.color }))
            : MOD_ORDER.filter((k) => sheet.slots.some((s) => s.mod === k)).map((k) => ({
                key: k,
                short: MODS[k].label,
                color: MODS[k].color,
              }))
        }
      >
        {slots.map((s, si) => {
          const sk = info.get(`${s.mod}-${s.slot}`);
          const color = sk?.group.color ?? MODS[s.mod]?.color;
          const label = sk?.label ?? s.label;
          return (
            <SlotBox
              key={`${s.mod}-${s.slot}`}
              id={`${stage.id}-${s.mod}-${s.slot}`}
              mod={sk?.group.id ?? s.mod}
              i={si}
              picked={s.picked}
              empty={s.items.length === 0}
              color={color}
              pick={s.picked && host && unset(s) && <ActionForm action={pickIntoPool.bind(null, stage.id, s.mod, s.slot)} submit={t.admin.pf.pick} ghost tone="danger" className="[&_button]:min-h-7 [&_button]:px-2.5 [&_button]:text-[11px]" />}
              header={
                <>
                  <span className={cn("in-slam heading-slam shrink-0 whitespace-nowrap text-2xl [--d:0.2s]", s.mod !== "Tiebreaker" && "w-24")} style={{ color: modHi(color) }}>
                    {label}
                  </span>
                  {sk && s.mod !== "Tiebreaker" && <ModChip mod={s.mod} />}
                  {sk && <TagChips names={subcategoryNames(plan.subcategories, sk.ids)} color={color} />}
                  {!s.picked && s.waitingOn.length ? (
                    <span className="in-drop flex min-w-0 items-center gap-1.5 text-xs text-ash [--d:0.3s]">
                      <Hourglass className="size-3.5 shrink-0" />
                      <span className="font-display font-bold">{t.admin.waitingOn}</span>
                      <span className="truncate">{s.waitingOn.join(", ")}</span>
                    </span>
                  ) : null}
                  <span className="ml-auto flex items-center gap-3">
                    {edit && !s.picked && !s.out && (
                      <SlotPop action={suggestMap.bind(null, stage.id, s.mod, s.slot)} title={t.admin.suggestForSlot} slot={label} color={color} submit={t.admin.suggest} tags={sk ? { groups: plan.subcategories, preset: sk.ids } : undefined} />
                    )}
                  </span>
                </>
              }
            >
              <ul className="divide-y divide-line">
                {s.items.map((m, i) => {
                  const place = places(s.items)[i];
                  const tops = s.items.filter((x, k) => !x.picked && places(s.items)[k] === 1 && x.pts !== null).length;
                  const tiedWin = s.tie && place === 1;
                  const lead = !s.picked && !s.tie && place === 1 && tops === 1 && m.pts !== null;
                  const green = m.picked || tiedWin;
                  const own = m.osuId === viewer.osuId;
                  return (
                    <li
                      key={m.id}
                      style={{ "--i": i, "--s": "0.04s", "--d": "0.25s" } as React.CSSProperties}
                      className={cn("in-left relative isolate flex flex-wrap items-center gap-3 overflow-hidden py-3.5 pl-4 pr-5 max-sm:pb-8", green && "bg-balkan/[0.07]")}
                    >
                      {/* the home mappool row's cover, across the whole row */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-[0.09] dark:opacity-[0.06]" />
                      {(green || lead) && <span className={cn("absolute inset-y-0 left-0 w-1", green ? "bg-balkan" : "bg-rose")} aria-hidden />}
                      <span
                        className={cn(
                          "relative isolate grid size-8 shrink-0 place-items-center text-sm font-display font-black",
                          m.picked ? "text-on-fill" : tiedWin ? "text-paper/60" : lead ? "text-rose-hi" : "text-ash",
                        )}
                        title={m.picked ? t.admin.slotPicked : undefined}
                      >
                        <SlantBg className={cn(m.picked ? "bg-balkan" : tiedWin && "bg-paper/10")} />
                        <span className="num">{m.picked ? <Check className="size-4" strokeWidth={3.5} /> : tiedWin ? "–" : `#${place}`}</span>
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cardCover(m.cover)} alt="" className="hidden h-12 w-28 shrink-0 object-cover sm:block" />
                      <div className="min-w-0 flex-1 basis-56">
                        <MapMeta id={m.beatmapId} map={m}>
                          <span className="text-ash">
                            {t.admin.suggestedBy} <span className="font-bold text-paper/80">{m.by}</span>
                          </span>
                          {earlier.has(m.beatmapId) && <span className="font-display font-bold text-rose-hi">{t.admin.pf.earlier}</span>}
                        </MapMeta>
                        <TagChips names={subcategoryNames(plan.subcategories, m.subcategoryIds)} color={color} filled className="mt-1.5" />
                      </div>
                      <div className="flex w-full flex-wrap items-start justify-end gap-3 sm:w-auto">
                        <VoteCell
                          key={m.id}
                          id={m.id}
                          viewer={viewer.osuId}
                          mine={m.mine}
                          mineNote={m.mineNote}
                          canVote={vote}
                          own={own}
                          picked={s.picked}
                          won={green}
                          lead={lead}
                          votes={m.votes}
                          waiting={s.picked ? [] : sheet.poolers.filter((p) => p.osuId !== m.osuId && !m.votes.some((v) => v.osuId === p.osuId))}
                        />
                        {host && !win && s.tie && m.pts === s.items[0].pts && (
                          <IconAction action={pickSuggestion.bind(null, m.id)} label={t.admin.pickThis} confirm={t.admin.confirmPickThis}>
                            <Check className="size-4 transition-transform group-hover:-translate-y-px" strokeWidth={3} />
                          </IconAction>
                        )}
                        {edit && !m.picked && (own || host) ? (
                          <IconAction action={removeSuggestion.bind(null, m.id)} label={t.admin.remove} confirm={t.admin.confirmRemoveSuggestion(m.votes.length)} danger bare>
                            <Trash2 className="size-4 transition-transform group-hover:-translate-y-px" />
                          </IconAction>
                        ) : (
                          <span className="size-10" aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SlotBox>
          );
        })}
      </SheetView>
      </Fragment>
    </>
  );
}
