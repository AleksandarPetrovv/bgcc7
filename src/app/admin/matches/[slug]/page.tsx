import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { PageTitle } from "@/components/site/page";
import { Words } from "@/components/site/rich";
import { ActionForm, inputCls, labelCls, Panel } from "@/components/admin/form";
import { getPoolStages } from "@/db/mappools";
import { getEdits, getScoreboard } from "@/db/scoreboards";
import { getMatches, getTeams } from "@/db/tournament";
import { getViewer } from "@/lib/authz";
import { fmtNum, MODS } from "@/lib/data";
import { getDict } from "@/lib/i18n/server";
import { can } from "@/lib/roles";
import { matchIdFromSlug, matchSlug } from "@/lib/matches";
import { cn } from "@/lib/utils";
import { removeScore, saveScore, undoScore } from "./actions";

const TEAM_SIZE = 3;

export default async function MatchScores({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = matchIdFromSlug(slug);
  if (matchSlug(id) !== slug) notFound();
  const [t, viewer, all, teams, stages] = await Promise.all([getDict(), getViewer(), getMatches(), getTeams(), getPoolStages()]);
  if (!can(viewer?.role, "matches")) notFound();
  const match = all.find((m) => m.id === id);
  if (!match) notFound();
  const [sb, edits] = match.links.length ? await Promise.all([getScoreboard(match, teams, stages), getEdits(id)]) : [null, []];
  const sides = [teams.find((x) => x.id === match.team1.id), teams.find((x) => x.id === match.team2.id)] as const;
  const nameOf = (osuId: number) => sides.flatMap((s) => s?.players ?? []).find((p) => p.userId === osuId)?.username ?? String(osuId);
  const maps = sb?.maps.filter((m) => !m.note) ?? [];

  return (
    <>
      <Link href="/admin/matches" className="in-left mb-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-ash hover:text-paper">
        <ArrowLeft className="size-3.5" /> {t.admin.ms.back}
      </Link>
      <PageTitle mark="bars" right={sb && <span className="num text-3xl text-paper">{sb.score.join(" - ")}</span>}>
        {`${sides[0]?.name ?? t.common.tbd} vs ${sides[1]?.name ?? t.common.tbd}`}
      </PageTitle>
      <p className="-mt-4 mb-8 max-w-2xl text-sm text-ash">
        <Words text={t.admin.ms.help} d={0.15} s={0.012} />
      </p>

      {!match.links.length ? (
        <p className="py-10 text-center text-ash">{t.admin.ms.noLinks}</p>
      ) : !sb ? (
        <p className="py-10 text-center text-rose-hi">{t.admin.ms.mpError}</p>
      ) : maps.length === 0 ? (
        <p className="py-10 text-center text-ash">{t.admin.ms.noMaps}</p>
      ) : (
        <div className="space-y-6">
          {maps.map((m, n) => {
            const color = m.mod ? MODS[m.mod]?.color : undefined;
            const gone = edits.filter((e) => e.gameId === m.gameId && e.removed);
            return (
              <Panel key={m.gameId} i={Math.min(n, 4)} title={`${m.slot ?? "—"} · ${m.title} [${m.version}]`}>
                <div className="mb-3 flex items-center gap-3 text-sm">
                  <span className="h-4 w-1" style={{ background: color ?? "var(--color-line)" }} />
                  <span className="num text-lg">
                    <span className={m.winner === 1 ? "text-rose-hi" : "text-ash"}>{fmtNum(m.team1)}</span>
                    <span className="text-ash"> vs </span>
                    <span className={m.winner === 2 ? "text-azure-hi" : "text-ash"}>{fmtNum(m.team2)}</span>
                  </span>
                  <span className="num ml-auto text-ash">{m.running.join(" - ")}</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {([0, 1] as const).map((k) => {
                    const team = sides[k];
                    const lines = m.players[k];
                    const missing = Math.max(0, TEAM_SIZE - lines.length);
                    const out = new Set(gone.map((e) => e.osuId));
                    const blank = (team?.players ?? []).filter((p) => !lines.some((l) => l.id === p.userId) && !out.has(p.userId));
                    return (
                      <div key={k} className={cn("border-l-[3px] bg-ink p-3", k === 0 ? "border-l-rose" : "border-l-azure")}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={cn("text-xs font-black uppercase tracking-wide", k === 0 ? "text-rose-hi" : "text-azure-hi")}>{team?.name ?? t.common.tbd}</span>
                          {missing > 0 && (
                            <span className="ml-auto inline-flex items-center gap-1 bg-rose/15 px-1.5 py-0.5 text-[0.65rem] font-black uppercase text-rose-hi">
                              <TriangleAlert className="size-3" /> {t.admin.ms.missing(missing)}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1.5">
                          {lines.map((p) => (
                            <li key={p.id}>
                              <details className="group border border-line">
                                <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 text-sm">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={p.avatar} alt="" className="size-6 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                                  {p.edited && <span className="text-[0.6rem] font-black uppercase text-[#e8c547]">{t.admin.ms.edited}</span>}
                                  {p.mods.length > 0 && <span className="text-[0.65rem] font-black uppercase text-ash">{p.mods.join("")}</span>}
                                  <span className="num w-14 text-right text-ash">{(p.acc * 100).toFixed(2)}%</span>
                                  <span className="num w-20 text-right">{fmtNum(p.score)}</span>
                                </summary>
                                <div className="flex flex-wrap items-end gap-3 border-t border-line p-2">
                                  <ActionForm action={saveScore.bind(null, id, m.gameId, p.id)} className="flex flex-wrap items-end gap-2">
                                    <label className={labelCls}>
                                      {t.admin.ms.score}
                                      <input name="score" inputMode="numeric" required defaultValue={p.score} className={cn(inputCls, "w-28")} />
                                    </label>
                                    <label className={labelCls}>
                                      {t.admin.ms.acc}
                                      <input name="acc" inputMode="decimal" required defaultValue={(p.acc * 100).toFixed(2)} className={cn(inputCls, "w-20")} />
                                    </label>
                                    <label className={labelCls}>
                                      {t.admin.ms.mods}
                                      <input name="mods" defaultValue={p.mods.join("")} placeholder="HDHR" className={cn(inputCls, "w-20")} />
                                    </label>
                                  </ActionForm>
                                  <ActionForm action={removeScore.bind(null, id, m.gameId, p.id, (k + 1) as 1 | 2)} submit={t.admin.ms.remove} ghost />
                                  {p.edited && <ActionForm action={undoScore.bind(null, id, m.gameId, p.id)} submit={t.admin.ms.undo} ghost />}
                                </div>
                              </details>
                            </li>
                          ))}
                          {blank.map((p) => (
                            <li key={p.userId}>
                              <details className="group border border-dashed border-rose/50">
                                <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-1.5 text-sm">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={p.avatar} alt="" className="size-6 shrink-0 opacity-60" />
                                  <span className="min-w-0 flex-1 truncate font-bold text-paper/70">{p.username}</span>
                                  <span className="text-[0.6rem] font-black uppercase text-rose-hi">{t.admin.ms.noScore}</span>
                                  <span className="num w-14 text-right text-ash">0.00%</span>
                                  <span className="num w-20 text-right text-ash">0</span>
                                </summary>
                                <div className="border-t border-line p-2">
                                  <ActionForm action={saveScore.bind(null, id, m.gameId, p.userId)} className="flex flex-wrap items-end gap-2">
                                    <label className={labelCls}>
                                      {t.admin.ms.score}
                                      <input name="score" inputMode="numeric" required defaultValue={0} className={cn(inputCls, "w-28")} />
                                    </label>
                                    <label className={labelCls}>
                                      {t.admin.ms.acc}
                                      <input name="acc" inputMode="decimal" required defaultValue="0.00" className={cn(inputCls, "w-20")} />
                                    </label>
                                    <label className={labelCls}>
                                      {t.admin.ms.mods}
                                      <input name="mods" placeholder="HD" className={cn(inputCls, "w-20")} />
                                    </label>
                                  </ActionForm>
                                </div>
                              </details>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                {gone.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-black uppercase tracking-wide text-ash">{t.admin.ms.removed}</span>
                    {gone.map((e) => (
                      <span key={e.osuId} className="flex items-center gap-2 border border-line px-2 py-1">
                        <span className="font-bold">{nameOf(e.osuId)}</span>
                        <ActionForm action={undoScore.bind(null, id, m.gameId, e.osuId)} submit={t.admin.ms.restore} ghost />
                      </span>
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
