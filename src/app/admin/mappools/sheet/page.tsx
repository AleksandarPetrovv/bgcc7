import { notFound } from "next/navigation";
import { Check, Hourglass, Scale, Star, Trash2 } from "lucide-react";
import { LinkTabs } from "@/components/site/tabs";
import { InView } from "@/components/site/in-view";
import { PageTitle } from "@/components/site/page";
import { ActionForm, Field, IconAction, inputCls, Panel } from "@/components/admin/form";
import { Dropdown } from "@/components/admin/dropdown";
import { getPoolStages } from "@/db/mappools";
import { getSheet } from "@/db/pool-sheet";
import { getViewer } from "@/lib/authz";
import { fmtLen, MODS } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { PoolMode } from "../pool-mode";
import { pickNow, pickSuggestion, removeSuggestion, suggestMap } from "./actions";
import { VoteCell } from "./vote-cell";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

const places = (items: { picked: boolean; avg: number | null }[]) => {
  const out: number[] = [];
  items.forEach((m, i) => {
    const prev = items[i - 1];
    out.push(i === 0 ? 1 : prev.picked !== m.picked || prev.avg === null || m.avg === null || Math.abs(prev.avg - m.avg) > 1e-9 ? out[i - 1] + 1 : out[i - 1]);
  });
  return out;
};

export default async function PoolSheet({ searchParams }: PageProps<"/admin/mappools/sheet">) {
  const [t, viewer, stages, sp] = await Promise.all([getDict(), getViewer(), getPoolStages(), searchParams]);
  if (!viewer || !can(viewer.roles, "mappools")) notFound();
  const stage = stages.find((s) => s.slug === sp.stage) ?? stages[0];
  if (!stage) return null;
  const host = can(viewer.roles, "phase");
  const edit = can(viewer.roles, "poolEdit");
  const vote = can(viewer.roles, "poolVote");
  const sheets = await Promise.all(stages.map((s) => getSheet(s.id, viewer.osuId)));
  const sheet = sheets[stages.indexOf(stage)];
  const name = (s: { title: string }) => t.rounds[s.title] ?? s.title;

  return (
    <>
      <PageTitle>{t.admin.menu.mappools}</PageTitle>
      <PoolMode t={t} on="sheet" stage={stage.slug} edit={edit} />

      <LinkTabs
        className="mb-6"
        label={t.admin.menu.mappools}
        items={stages.map((s, i) => ({
          href: `/admin/mappools/sheet?stage=${s.slug}`,
          active: s.id === stage.id,
          label: (
            <>
              {name(s)}
              {vote && sheets[i].owed > 0 && <span className="num grid min-w-5 place-items-center bg-rose px-1 text-xs text-white">{sheets[i].owed}</span>}
            </>
          ),
        }))}
      />

      {edit && (
        <Panel title={t.admin.suggestMap} className="mb-6">
          <ActionForm key={stage.id} action={suggestMap.bind(null, stage.id)} submit={t.admin.suggest} className="flex flex-wrap items-end gap-3">
            <label className={cn(label, "min-w-56 flex-1")}>
              {t.admin.beatmap}
              <Field name="beatmap" required placeholder="https://osu.ppy.sh/b/…" className={inputCls} />
            </label>
            <label className={cn(label, "w-40")}>
              {t.admin.mod}
              <Dropdown name="mod" defaultValue="NoMod" options={Object.entries(MODS).map(([k, v]) => ({ value: k, label: v.label, color: v.color }))} />
            </label>
            <label className={cn(label, "w-24")}>
              {t.admin.slot}
              <Field name="slot" type="number" min={1} max={20} required defaultValue={1} className={inputCls} />
            </label>
          </ActionForm>
        </Panel>
      )}

      {sheet.slots.length === 0 && <p className="in-up border border-line bg-coal p-4 text-sm text-ash [--d:0.3s]">{t.admin.noSuggestions}</p>}

      <div className="space-y-4">
        {sheet.slots.map((s, si) => {
          const color = MODS[s.mod]?.color;
          return (
            <InView
              as="section"
              self
              scrub
              key={`${s.mod}-${s.slot}`}
              className={cn("sr in-up relative overflow-clip border bg-coal", s.picked ? "border-balkan/50" : "border-line")}
              style={{ "--i": si < 5 ? si : 0, "--s": "0.1s", "--d": "0.4s" } as React.CSSProperties}
            >
              <span className="sr in-grow absolute inset-x-0 top-0 h-0.5 [--d:0.55s]" style={{ background: color }} aria-hidden />
              <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
                <span className="sr in-slam heading-slam text-2xl [--d:0.6s]" style={{ color }}>
                  {s.label}
                </span>
                {s.picked ? (
                  <span className="sr in-pop flex items-center gap-1.5 text-xs font-black uppercase text-balkan [--d:0.7s]">
                    <Check className="size-3.5" strokeWidth={3} /> {t.admin.slotPicked}
                  </span>
                ) : s.tie ? (
                  <span className="sr in-pop flex -skew-x-12 items-center border border-rose/70 bg-rose/15 px-2.5 py-1 text-xs font-black uppercase text-rose-hi [--d:0.7s]">
                    <span className="flex skew-x-12 items-center gap-1.5">
                      <Scale className="size-3.5" /> {host ? t.admin.tieHost : t.admin.tie}
                    </span>
                  </span>
                ) : s.waitingOn.length ? (
                  <span className="sr in-drop flex min-w-0 items-center gap-1.5 text-xs text-ash [--d:0.7s]">
                    <Hourglass className="size-3.5 shrink-0" />
                    <span className="font-black uppercase">{t.admin.waitingOn}</span>
                    <span className="truncate">{s.waitingOn.join(", ")}</span>
                  </span>
                ) : null}
                {host && !s.picked && !s.tie && s.items.some((i) => i.votes.length) && (
                  <ActionForm action={pickNow.bind(null, stage.id, s.mod, s.slot)} submit={t.admin.pickNow} ghost confirm={t.admin.confirmPickNow} className="ml-auto" />
                )}
              </header>
              <ul className="divide-y divide-line">
                {s.items.map((m, i) => {
                  const place = places(s.items)[i];
                  const tops = s.items.filter((x, k) => !x.picked && places(s.items)[k] === 1 && x.avg !== null).length;
                  const tiedWin = s.tie && place === 1;
                  const lead = !s.picked && !s.tie && place === 1 && tops === 1 && m.avg !== null;
                  const green = m.picked || tiedWin;
                  const own = m.osuId === viewer.osuId;
                  return (
                    <li
                      key={m.id}
                      style={{ "--i": i, "--s": "0.05s", "--d": "0.65s" } as React.CSSProperties}
                      className={cn("sr in-left relative flex flex-wrap items-center gap-3 py-2.5 pl-4 pr-3", green && "bg-balkan/[0.07]")}
                    >
                      {(green || lead) && <span className={cn("absolute inset-y-0 left-0 w-1", green ? "bg-balkan" : "bg-rose")} aria-hidden />}
                      <span
                        className={cn(
                          "grid size-8 shrink-0 -skew-x-12 place-items-center border text-sm font-black",
                          m.picked
                            ? "border-balkan bg-balkan text-ink"
                            : tiedWin
                              ? "border-paper/25 bg-paper/10 text-paper/60"
                              : lead
                                ? "border-rose/70 text-rose-hi"
                                : "border-line text-ash",
                        )}
                        title={m.picked ? t.admin.slotPicked : undefined}
                      >
                        <span className="num skew-x-12">{m.picked ? <Check className="size-4" strokeWidth={3.5} /> : tiedWin ? "–" : `#${place}`}</span>
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.cover} alt="" className="hidden h-12 w-28 shrink-0 object-cover sm:block" />
                      <div className="min-w-0 flex-1 basis-56">
                        <a
                          href={`https://osu.ppy.sh/b/${m.beatmapId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-bold decoration-rose underline-offset-4 transition-colors hover:text-rose-hi hover:underline"
                        >
                          {m.title} <span className="text-ash">[{m.version}]</span>
                        </a>
                        <div className="num flex flex-wrap gap-x-3 text-sm text-paper/70">
                          <span className="flex items-center gap-1 text-[#e8c547]">
                            <Star className="size-3.5 fill-current" /> {m.sr.toFixed(2)}
                          </span>
                          <span>{Math.round(m.bpm)} bpm</span>
                          <span>{fmtLen(m.length)}</span>
                          <span className="text-ash">ID: {m.beatmapId}</span>
                          <span className="text-ash">
                            {t.admin.suggestedBy} <span className="font-bold text-paper/80">{m.by}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
                        <VoteCell
                          key={`${m.id}-${m.mine}-${m.votes.length}`}
                          id={m.id}
                          viewer={viewer.osuId}
                          mine={m.mine}
                          canVote={vote}
                          own={own}
                          picked={s.picked}
                          won={green}
                          lead={lead}
                          votes={m.votes}
                          waiting={s.picked ? [] : sheet.poolers.filter((p) => p.osuId !== m.osuId && !m.votes.some((v) => v.osuId === p.osuId))}
                        />
                        {host && s.tie && m.avg === s.items[0].avg && (
                          <IconAction action={pickSuggestion.bind(null, m.id)} label={t.admin.pickThis} confirm={t.admin.confirmPickThis}>
                            <Check className="size-4 transition-transform group-hover:scale-110" strokeWidth={3} />
                          </IconAction>
                        )}
                        {edit && !m.picked && (own || host) ? (
                          <IconAction action={removeSuggestion.bind(null, m.id)} label={t.admin.remove} confirm={t.admin.confirmRemoveSuggestion} danger>
                            <Trash2 className="size-4 transition-transform group-hover:rotate-12" />
                          </IconAction>
                        ) : (
                          <span className="size-10" aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </InView>
          );
        })}
      </div>
    </>
  );
}
