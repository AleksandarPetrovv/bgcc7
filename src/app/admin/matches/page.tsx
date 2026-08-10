import { notFound } from "next/navigation";
import { ActionForm, inputCls, Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getMatchRows, getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { FEED } from "@/lib/pickems";
import { can } from "@/lib/roles";
import { fmtSofia, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { clearCache, decideReschedule, fillFromSeeds, resetBracket, saveMatch } from "./actions";
import { getReschedules, OPEN } from "@/db/reschedules";

const label = "flex flex-col gap-1 text-xs font-bold uppercase text-ash";

export default async function AdminMatches() {
  const [t, lang, viewer, rows, teams, stages, requests] = await Promise.all([
    getDict(),
    getLang(),
    getViewer(),
    getMatchRows(),
    getTeams(),
    getPoolStages(),
    getReschedules(),
  ]);
  const open = requests.filter((r) => OPEN.includes(r.status));
  const recent = requests.filter((r) => !OPEN.includes(r.status)).slice(0, 5);
  if (!can(viewer?.role, "matches")) notFound();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? t.common.tbd;
  const bracketStages = stages.filter((s) => s.slug !== "qualifiers");

  return (
    <>
      <h1 className="heading-slam mb-2 text-4xl sm:text-5xl">{t.admin.menu.matches}</h1>
      <p className="mb-6 max-w-2xl text-sm text-ash">{t.admin.matchesHelp}</p>

      <div className="mb-6 flex flex-wrap gap-3 border border-line bg-coal p-4">
        <ActionForm action={fillFromSeeds} submit={t.admin.fillSeeds} ghost confirm={t.admin.confirmFillSeeds} />
        <ActionForm action={resetBracket} submit={t.admin.resetBracket} ghost confirm={t.admin.confirmResetBracket} />
      </div>

      <Panel title={t.admin.reschedules} className="mb-8">
        {open.length === 0 && <p className="text-sm text-ash">{t.admin.noReschedules}</p>}
        <div className="space-y-2">
          {open.map((r) => {
            const m = rows.find((x) => x.id === r.matchId);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-line bg-ink px-3 py-2.5">
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-bold">
                    {r.matchId} · {name(m?.team1Id ?? null)} vs {name(m?.team2Id ?? null)}
                  </div>
                  <div className="text-ash">
                    {t.admin.rescheduleLine(name(r.teamId), r.requester ?? String(r.requestedBy), m?.startsAt ? fmtSofia(m.startsAt, locale) : t.common.tbd, fmtSofia(r.proposedAt, locale))}
                    {r.reason && <> · {r.reason}</>}
                  </div>
                  <div className={cn("text-xs font-black uppercase", r.status === "accepted" ? "text-balkan" : "text-ash")}>
                    {r.status === "accepted" ? t.admin.opponentAgreed : t.admin.opponentPending}
                  </div>
                </div>
                <ActionForm action={decideReschedule.bind(null, r.id, true)} submit={t.admin.approve} />
                <ActionForm action={decideReschedule.bind(null, r.id, false)} submit={t.admin.deny} ghost />
              </div>
            );
          })}
        </div>
        {recent.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-ash">
            {recent.map((r) => (
              <li key={r.id}>
                {r.matchId} · {name(r.teamId)} · {fmtSofia(r.proposedAt, locale)} · <span className="font-black uppercase">{t.schedule.resched.status[r.status] ?? r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="space-y-8">
        {bracketStages.map((s) => (
          <Panel key={s.slug} title={`${t.rounds[s.title] ?? s.title} · ${t.admin.firstToShort(s.firstTo ?? 7)}`}>
            <div className="space-y-2">
              {rows
                .filter((m) => m.stageSlug === s.slug)
                .map((m) => (
                  <details key={m.id} className="border border-line bg-ink">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
                      <span className="num w-20 text-sm text-ash">{m.id}</span>
                      <span className="text-xs font-black uppercase text-rose-hi">{t.rounds[m.round] ?? m.round}</span>
                      <span className="min-w-0 flex-1 truncate font-bold">
                        {name(m.team1Id)} <span className="num text-balkan">{m.score1 ?? "-"}</span> : <span className="num text-balkan">{m.score2 ?? "-"}</span> {name(m.team2Id)}
                      </span>
                      <span className="num text-sm text-ash">{m.startsAt ? fmtSofia(m.startsAt, locale) : t.common.tbd}</span>
                      {m.winner && <span className="text-xs font-black uppercase text-balkan">{t.admin.done}</span>}
                    </summary>
                    <div className="border-t border-line p-3">
                      <ActionForm key={JSON.stringify(m)} action={saveMatch.bind(null, m.id)} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <label className={cn(label, "col-span-2")}>
                            {t.admin.startsAt}
                            <input type="datetime-local" name="startsAt" defaultValue={toSofiaInput(m.startsAt)} className={cn(inputCls, "[color-scheme:dark]")} />
                          </label>
                          <label className={label}>
                            {t.admin.referee}
                            <input name="referee" maxLength={120} defaultValue={m.referee ?? ""} className={inputCls} />
                          </label>
                          <label className={label}>
                            {t.admin.streamer}
                            <input name="streamer" maxLength={120} defaultValue={m.streamer ?? ""} className={inputCls} />
                          </label>
                          {([1, 2] as const).map((n) => (
                            <label key={n} className={cn(label, "col-span-2 md:col-span-1")}>
                              {t.admin.teamN(n)}
                              <select name={`team${n}Id`} defaultValue={(n === 1 ? m.team1Id : m.team2Id) ?? ""} className={inputCls}>
                                <option value="">{t.common.tbd}</option>
                                {teams.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                          <label className={label}>
                            {t.admin.scoreN(1)}
                            <input type="number" name="score1" min={0} max={99} defaultValue={m.score1 ?? ""} className={inputCls} />
                          </label>
                          <label className={label}>
                            {t.admin.scoreN(2)}
                            <input type="number" name="score2" min={0} max={99} defaultValue={m.score2 ?? ""} className={inputCls} />
                          </label>
                          <label className={cn(label, "col-span-2")}>
                            {t.admin.winner}
                            <select name="winner" defaultValue="auto" className={inputCls}>
                              <option value="auto">{t.admin.winnerAuto}</option>
                              <option value="1">{name(m.team1Id)}</option>
                              <option value="2">{name(m.team2Id)}</option>
                              <option value="none">{t.admin.winnerNone}</option>
                            </select>
                          </label>
                          <label className={cn(label, "col-span-2")}>
                            {t.admin.commentators}
                            <input name="commentators" maxLength={120} defaultValue={m.commentators ?? ""} className={inputCls} />
                          </label>
                          <label className={cn(label, "col-span-2")}>
                            {t.admin.mpLinks}
                            <input name="mpLinks" defaultValue={m.mpLinks.split(",").filter(Boolean).map((x) => `https://osu.ppy.sh/mp/${x}`).join(", ")} className={inputCls} />
                          </label>
                          <label className={cn(label, "col-span-2")}>
                            {t.admin.vodUrl}
                            <input name="vodUrl" maxLength={300} placeholder="https://…" defaultValue={m.vodUrl ?? ""} className={inputCls} />
                          </label>
                        </div>
                        {FEED[m.id] && (
                          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
                            <input type="checkbox" name="manual" defaultChecked={m.manual} className="size-4 accent-rose" />
                            {t.admin.lockTeams}
                          </label>
                        )}
                      </ActionForm>
                      {m.mpLinks && (
                        <div className="mt-3 border-t border-line pt-3">
                          <ActionForm action={clearCache.bind(null, m.id)} submit={t.admin.clearCache} ghost />
                        </div>
                      )}
                    </div>
                  </details>
                ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
