import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page-title";
import { ActionForm, DateTimeField, Panel } from "@/components/admin/form";
import { labelCls } from "@/components/admin/label";
import { getPoolStages } from "@/db/mappools";
import { getMatchRows, getTeams } from "@/db/tournament";
import { historyOf, stageWeeks } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { fmtSofia, toSofiaInput } from "@/lib/time";
import { historyLabel, isOpen, weekOf } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { setTime, setWeek } from "./actions";
import { localeOf } from "@/lib/i18n/locale";
import { roundName } from "@/lib/i18n/dict";
import { isBracketStage } from "@/lib/format";
import { SlantBg } from "@/components/site/slant";

const TONE: Record<string, { bar: string; chip: string; ink: string }> = {
  agreed: { bar: "bg-balkan", chip: "bg-balkan", ink: "text-on-fill" },
  staff: { bar: "bg-rose", chip: "bg-rose", ink: "text-white" },
  proposed: { bar: "bg-gold", chip: "bg-gold", ink: "text-on-fill" },
  tbd: { bar: "bg-line", chip: "border border-line", ink: "text-ash" },
  waiting: { bar: "bg-line", chip: "border border-line", ink: "text-ash" },
};

export default async function AdminScheduling() {
  const [t, lang, viewer, rows, teams, stages, weeks] = await Promise.all([getDict(), getLang(), getViewer(), getMatchRows(), getTeams(), getPoolStages(), stageWeeks()]);
  if (!can(viewer?.roles, "matches")) notFound();
  const s = t.sched;
  const locale = localeOf(lang);
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? "—";
  const captain = (osuId: number | null) => (osuId == null ? s.staffName : (teams.flatMap((x) => x.players).find((p) => p.userId === osuId)?.username ?? s.staffName));
  const hist = await historyOf(rows.map((m) => m.id));
  const list = stages.filter((x) => isBracketStage(x.slug));
  const Side = ({ id, side }: { id: string | null; side: 0 | 1 }) => {
    const team = teams.find((x) => x.id === id);
    return (
      <span data-cascade className={cn("flex min-w-0 items-center gap-1.5 sm:gap-2.5", side === 1 ? "in-right flex-row-reverse text-right" : "in-left")}>
        {team?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.image} alt="" className={cn("size-7 shrink-0 border-b-[3px] object-cover sm:size-9", side ? "border-azure" : "border-crimson")} />
        ) : (
          <span className={cn("size-7 shrink-0 border-b-[3px] bg-slate sm:size-9", side ? "border-azure" : "border-crimson")} />
        )}
        <span className={cn("min-w-0 truncate text-sm font-display font-black sm:text-base", !team && "text-ash")}>{team?.name ?? t.common.tbd}</span>
      </span>
    );
  };

  return (
    <>
      <PageTitle mark="clock">{t.admin.menu.scheduling}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">{s.admin.help}</p>
      <Cascade className="space-y-8" step={0.035}>
        {list.map((st, n) => {
          const wk = weekOf(weeks[st.slug]);
          const rank = (m: (typeof rows)[number]) => (!m.team1Id || !m.team2Id ? 2 : m.startsAt ? 1 : 0);
          const ms = rows.filter((m) => m.stageSlug === st.slug).sort((a, b) => rank(a) - rank(b));
          return (
            <Panel key={st.slug} i={n < 3 ? n + 1 : 0} title={roundName(t, st.title)} help={wk ? s.admin.deadline(fmtSofia(wk.deadline, locale)) : undefined}>
              <ActionForm action={setWeek.bind(null, st.slug)} className="mb-6 flex flex-wrap items-end gap-3" ghost>
                <label className={labelCls}>
                  {s.admin.week}
                  <DateTimeField kind="date" name="week" defaultValue={weeks[st.slug] ?? ""} className="w-[18rem]" />
                </label>
              </ActionForm>
              {ms.length ? (
                <div className="space-y-3">
                  {ms.map((m) => {
                    const h = hist.get(m.id) ?? [];
                    const pend = h.find((p) => p.status === "pending");
                    const state = !m.team1Id || !m.team2Id ? "waiting" : m.startsAt ? "agreed" : !isOpen(wk) ? "staff" : pend ? "proposed" : "tbd";
                    return (
                      <div key={m.id} data-cascade className="in-up relative border border-line bg-ink/40">
                        <span className={cn("absolute inset-y-0 left-0 w-1", TONE[state].bar)} aria-hidden />
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-3 pl-4 pr-3 sm:gap-3 sm:pl-5 sm:pr-4">
                          <Side id={m.team1Id} side={0} />
                          <span data-cascade className="in-pop heading-slam text-sm text-ash sm:text-lg">VS</span>
                          <Side id={m.team2Id} side={1} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-2.5 pl-5 pr-4">
                          {m.round !== st.title && <span className="text-[0.68rem] font-display font-bold text-ash">{roundName(t, m.round)}</span>}
                          <span data-cascade className="in-up num text-base font-display font-bold">
                            {m.startsAt ? fmtSofia(m.startsAt, locale) : pend ? fmtSofia(new Date(pend.at), locale) : "—"}
                            {!m.startsAt && pend && <span className="ml-2 text-xs text-ash">{name(pend.teamId)}</span>}
                          </span>
                          <span data-cascade className="in-pop ml-auto">
                            <span className={cn("relative isolate inline-flex px-2.5 py-1 text-[0.68rem] font-display font-bold", TONE[state].ink)}>
                              <SlantBg className={TONE[state].chip} />
                              {s.admin.state[state]}
                            </span>
                          </span>
                        </div>
                        {h.length > 0 && (
                          <details className="border-t border-line pl-5 pr-4">
                            <summary className="cursor-pointer list-none py-2 text-xs font-display font-bold text-ash hover:text-paper [&::-webkit-details-marker]:hidden">{s.admin.history(h.length)}</summary>
                            <ol className="grid gap-1 pb-3 text-xs text-ash">
                              {h.slice(0, 6).map((p) => (
                                <li key={p.id} className="flex flex-wrap gap-x-2">
                                  <span className="num">{fmtSofia(new Date(p.at), locale)}</span>
                                  <span className="text-paper/85">{name(p.teamId)}</span>
                                  <span className="font-display font-bold">{historyLabel(p, s.st, captain)}</span>
                                  {p.note && <span className="basis-full italic">“{p.note}”</span>}
                                  {p.reply && <span className="basis-full italic text-rose-hi/80">↳ “{p.reply}”</span>}
                                </li>
                              ))}
                            </ol>
                          </details>
                        )}
                        <ActionForm action={setTime.bind(null, m.id)} className="flex flex-wrap items-end gap-3 border-t border-line py-3 pl-5 pr-4" submit={s.admin.set} ghost>
                          <label className={labelCls}>
                            {s.admin.at}
                            <DateTimeField name="at" defaultValue={toSofiaInput(m.startsAt)} className="w-[25rem]" />
                          </label>
                        </ActionForm>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-ash">{s.admin.none}</p>
              )}
            </Panel>
          );
        })}
      </Cascade>
    </>
  );
}
