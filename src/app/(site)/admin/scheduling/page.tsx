import { notFound } from "next/navigation";
import { PageTitle } from "@/components/site/page";
import { ActionForm, Field, Panel, dateCls, labelCls } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getMatchRows, getTeams } from "@/db/tournament";
import { historyOf, stageWeeks } from "@/db/schedule";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { fmtSofia, toSofiaInput } from "@/lib/time";
import { isOpen, weekOf, type Proposal } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Cascade } from "@/components/site/cascade";
import { setTime, setWeek } from "./actions";

const TONE: Record<string, { bar: string; chip: string }> = {
  agreed: { bar: "bg-balkan", chip: "bg-balkan text-on-fill" },
  staff: { bar: "bg-rose", chip: "bg-rose text-white" },
  proposed: { bar: "bg-gold", chip: "bg-gold text-on-fill" },
  tbd: { bar: "bg-line", chip: "border border-line text-ash" },
  waiting: { bar: "bg-line", chip: "border border-line text-ash" },
};

export default async function AdminScheduling() {
  const [t, lang, viewer, rows, teams, stages, weeks] = await Promise.all([getDict(), getLang(), getViewer(), getMatchRows(), getTeams(), getPoolStages(), stageWeeks()]);
  if (!can(viewer?.roles, "matches")) notFound();
  const s = t.sched;
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? "—";
  const teamOf = (osuId: number | null) => (osuId == null ? null : (teams.find((x) => x.players.some((p) => p.userId === osuId))?.id ?? null));
  const hist = await historyOf(rows.map((m) => m.id)).catch(() => new Map<string, Proposal[]>());
  const list = stages.filter((x) => x.slug !== "qualifiers");
  const Side = ({ id, side }: { id: string | null; side: 0 | 1 }) => {
    const team = teams.find((x) => x.id === id);
    return (
      <span data-cascade className={cn("flex min-w-0 items-center gap-2.5", side === 1 ? "in-right flex-row-reverse text-right" : "in-left")}>
        {team?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.image} alt="" className={cn("size-9 shrink-0 border-b-[3px] object-cover", side ? "border-azure" : "border-crimson")} />
        ) : (
          <span className={cn("size-9 shrink-0 border-b-[3px] bg-slate", side ? "border-azure" : "border-crimson")} />
        )}
        <span className={cn("min-w-0 truncate font-display font-black", !team && "text-ash")}>{team?.name ?? "TBD"}</span>
      </span>
    );
  };

  return (
    <>
      <PageTitle>{t.admin.menu.scheduling}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">{s.admin.help}</p>
      <Cascade className="space-y-8" step={0.035}>
        {list.map((st, n) => {
          const wk = weekOf(weeks[st.slug]);
          const ms = rows.filter((m) => m.stageSlug === st.slug);
          return (
            <Panel key={st.slug} i={n < 3 ? n + 1 : 0} title={t.rounds[st.title] ?? st.title} help={wk ? s.admin.deadline(fmtSofia(wk.deadline, locale)) : undefined}>
              <ActionForm action={setWeek.bind(null, st.slug)} className="mb-6 flex flex-wrap items-end gap-3" ghost>
                <label className={labelCls}>
                  {s.admin.week}
                  <Field type="date" name="week" defaultValue={weeks[st.slug] ?? ""} inputClassName={dateCls} />
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
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-3 pl-5 pr-4">
                          <Side id={m.team1Id} side={0} />
                          <span data-cascade className="in-pop heading-slam text-lg text-ash">VS</span>
                          <Side id={m.team2Id} side={1} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-2.5 pl-5 pr-4">
                          {m.round !== st.title && <span className="text-[0.68rem] font-display font-bold text-ash">{t.rounds[m.round] ?? m.round}</span>}
                          <span data-cascade className="in-up num text-base font-display font-bold">
                            {m.startsAt ? fmtSofia(m.startsAt, locale) : pend ? fmtSofia(new Date(pend.at), locale) : "—"}
                            {!m.startsAt && pend && <span className="ml-2 text-xs text-ash">{name(pend.teamId)}</span>}
                          </span>
                          <span data-cascade className="in-pop ml-auto">
                            <span className={cn("inline-flex -skew-x-12 px-2.5 py-1 text-[0.68rem] font-display font-bold", TONE[state].chip)}>
                              <span className="skew-x-12">{s.admin.state[state]}</span>
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
                                  <span className="font-display font-bold">{p.status === "staff" ? s.st.set : p.staff || (p.status === "cancelled" && p.answeredBy == null) ? s.st.staff : p.status === "rejected" ? s.st.rejected(name(p.teamId === m.team1Id ? m.team2Id : m.team1Id)) : p.status === "cancelled" ? s.st.cancelled(name(teamOf(p.answeredBy))) : s.st[p.status]}</span>
                                </li>
                              ))}
                            </ol>
                          </details>
                        )}
                        <ActionForm action={setTime.bind(null, m.id)} className="flex flex-wrap items-end gap-3 border-t border-line py-3 pl-5 pr-4" submit={s.admin.set} ghost>
                          <label className={labelCls}>
                            {s.admin.at}
                            <Field type="datetime-local" name="at" defaultValue={toSofiaInput(m.startsAt)} inputClassName={dateCls} />
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
