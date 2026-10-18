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
import { weekOf, type Proposal } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { setTime, setWeek } from "./actions";

export default async function AdminScheduling() {
  const [t, lang, viewer, rows, teams, stages, weeks] = await Promise.all([getDict(), getLang(), getViewer(), getMatchRows(), getTeams(), getPoolStages(), stageWeeks()]);
  if (!can(viewer?.roles, "matches")) notFound();
  const s = t.sched;
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? "—";
  const teamOf = (osuId: number | null) => (osuId == null ? null : (teams.find((x) => x.players.some((p) => p.userId === osuId))?.id ?? null));
  const hist = await historyOf(rows.map((m) => m.id)).catch(() => new Map<string, Proposal[]>());
  const list = stages.filter((x) => x.slug !== "qualifiers");

  return (
    <>
      <PageTitle>{t.admin.menu.scheduling}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">{s.admin.help}</p>
      <div className="space-y-8">
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
                <div className="space-y-2">
                  {ms.map((m) => {
                    const h = hist.get(m.id) ?? [];
                    const pend = h.find((p) => p.status === "pending");
                    const state = !m.team1Id || !m.team2Id ? "waiting" : m.startsAt ? "agreed" : pend ? "proposed" : "tbd";
                    return (
                      <div key={m.id} className="border border-line bg-ink/40 p-3 sm:p-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-rose-hi">{t.rounds[m.round] ?? m.round}</span>
                          <span className="min-w-0 font-black">
                            {name(m.team1Id)} <span className="text-ash">vs</span> {name(m.team2Id)}
                          </span>
                          <span className={cn("ml-auto text-[0.68rem] font-black uppercase tracking-wide", state === "agreed" ? "text-balkan" : state === "proposed" ? "text-gold" : "text-ash")}>{s.admin.state[state]}</span>
                        </div>
                        <p className="num mt-1 text-sm text-paper/85">
                          {m.startsAt ? fmtSofia(m.startsAt, locale) : pend ? `${fmtSofia(new Date(pend.at), locale)} · ${name(pend.teamId)}` : "—"}
                        </p>
                        {h.length > 0 && (
                          <ol className="mt-2 grid gap-0.5 text-xs text-ash">
                            {h.slice(0, 6).map((p) => (
                              <li key={p.id} className="flex flex-wrap gap-x-2">
                                <span className="num">{fmtSofia(new Date(p.at), locale)}</span>
                                <span>{name(p.teamId)}</span>
                                <span className="font-black uppercase">{p.status === "staff" ? s.st.set : p.staff || (p.status === "cancelled" && p.answeredBy == null) ? s.st.staff : p.status === "rejected" ? s.st.rejected(name(p.teamId === m.team1Id ? m.team2Id : m.team1Id)) : p.status === "cancelled" ? s.st.cancelled(name(teamOf(p.answeredBy))) : s.st[p.status]}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        <ActionForm action={setTime.bind(null, m.id)} className="mt-3 flex flex-wrap items-end gap-3" submit={s.admin.set} ghost>
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
      </div>
    </>
  );
}
