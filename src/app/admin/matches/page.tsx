import Link from "next/link";
import { notFound } from "next/navigation";
import { Words } from "@/components/site/rich";
import { PageTitle } from "@/components/site/page";
import { ActionForm, dateCls, inputCls, Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getMatchRows, getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { getDict, getLang } from "@/lib/i18n/server";
import { FEED } from "@/lib/pickems";
import { matchSlug } from "@/lib/matches";
import { can } from "@/lib/roles";
import { fmtSofia, toSofiaInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { clearCache, fillFromSeeds, resetBracket, saveMatch } from "./actions";

const label = "flex min-w-0 flex-col gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.1em] text-ash transition-colors";

export default async function AdminMatches() {
  const [t, lang, viewer, rows, teams, stages] = await Promise.all([
    getDict(),
    getLang(),
    getViewer(),
    getMatchRows(),
    getTeams(),
    getPoolStages(),
  ]);
  if (!can(viewer?.role, "matches")) notFound();
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const name = (id: string | null) => teams.find((x) => x.id === id)?.name ?? t.common.tbd;
  const bracketStages = stages.filter((s) => s.slug !== "qualifiers");

  return (
    <>
      <PageTitle>{t.admin.menu.matches}</PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.matchesHelp} d={0.15} s={0.012} />
      </p>

      <div className="in-right mb-6 flex flex-wrap gap-3 border border-line bg-coal p-4 [--d:0.25s]">
        <ActionForm action={fillFromSeeds} submit={t.admin.fillSeeds} ghost confirm={t.admin.confirmFillSeeds} />
        <ActionForm action={resetBracket} submit={t.admin.resetBracket} ghost confirm={t.admin.confirmResetBracket} />
      </div>

      <div className="space-y-8">
        {bracketStages.map((s, n) => (
          <Panel key={s.slug} i={n < 3 ? n + 1 : 0} title={`${t.rounds[s.title] ?? s.title} · ${t.admin.firstToShort(s.firstTo ?? 7)}`}>
            <div className="space-y-2">
              {rows
                .filter((m) => m.stageSlug === s.slug)
                .map((m, k) => (
                  <details key={m.id} style={{ "--i": k, "--s": "0.05s", "--d": "0.6s" } as React.CSSProperties} className="in-left border border-line bg-ink">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5">
                      <span className="num text-sm text-ash sm:w-20">{m.id}</span>
                      <span className="text-xs font-black uppercase text-rose-hi">{t.rounds[m.round] ?? m.round}</span>
                      <span className="order-last min-w-0 basis-full truncate font-bold sm:order-none sm:basis-0 sm:flex-1">
                        {name(m.team1Id)} <span className="in-slam num inline-block text-rose-hi [--d:0.85s]">{m.score1 ?? "-"}</span> : <span className="in-slam num inline-block text-azure-hi [--d:0.9s]">{m.score2 ?? "-"}</span> {name(m.team2Id)}
                      </span>
                      <span className="num ml-auto text-sm text-ash sm:ml-0">{m.startsAt ? fmtSofia(m.startsAt, locale) : t.common.tbd}</span>
                      {m.winner && <span className="in-pop text-xs font-black uppercase text-balkan [--d:0.95s]">{t.admin.done}</span>}
                    </summary>
                    <div className="border-t border-line p-3">
                      <ActionForm key={JSON.stringify(m)} action={saveMatch.bind(null, m.id)} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          <label className={cn(label, "col-span-2")}>
                            {t.admin.startsAt}
                            <input type="datetime-local" name="startsAt" defaultValue={toSofiaInput(m.startsAt)} className={dateCls} />
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
                          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-bold uppercase tracking-wide">
                            <input type="checkbox" name="manual" defaultChecked={m.manual} className="size-4 accent-rose" />
                            {t.admin.lockTeams}
                          </label>
                        )}
                      </ActionForm>
                      {m.mpLinks && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                          <Link href={`/admin/matches/${matchSlug(m.id)}`} className="lift-sm inline-flex min-h-9 -skew-x-12 items-center bg-balkan px-3 text-xs font-black uppercase tracking-wide text-ink hover:bg-paper">
                            <span className="skew-x-12">{t.admin.ms.open}</span>
                          </Link>
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
