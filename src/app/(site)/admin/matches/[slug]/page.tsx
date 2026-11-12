import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/site/page-title";
import { Words } from "@/components/site/rich";
import { firstToOf, getPoolStages } from "@/db/mappools";
import { getEdits, getScoreboard } from "@/db/scoreboards";
import { getMatches, getTeams } from "@/db/tournament";
import { isBGCC6 } from "@/db";
import { avatarPath } from "@/lib/avatar";
import { getViewer } from "@/lib/authz";
import { canRunMatch } from "@/lib/match-access";
import { matchLabel, startedAfter } from "@/lib/matches";
import { getDict } from "@/lib/i18n/server";
import { matchIdFromSlug } from "@/lib/format";
import { getFormat } from "@/db/edition";
import { multiPick } from "@/lib/mods";
import { editsStamp, type MapResult, type PlayerLine } from "@/lib/scoreboard";
import { editLocked } from "@/lib/edit-lock";
import { ScoreEditor } from "./score-editor";

export default async function MatchScores({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await getFormat();
  const id = matchIdFromSlug(f, slug);
  if (id !== slug) notFound();
  const [t, runs, all, teams, stages, viewer] = await Promise.all([getDict(), canRunMatch(id), getMatches(), getTeams(), getPoolStages(), getViewer()]);
  if (!runs) forbidden();
  const match = all.find((m) => m.id === id);
  if (!match) notFound();
  if (editLocked(viewer?.roles ?? [], match.datetime)) forbidden();
  const wiped = startedAfter(f, all, id).map((m) => matchLabel(f, t, m.id));
  const [sb, edits] = match.links.length ? await Promise.all([getScoreboard(match, teams, stages), getEdits(id)]) : [null, []];
  const sides = [teams.find((x) => x.id === match.team1.id), teams.find((x) => x.id === match.team2.id)] as const;
  const nameOf = (osuId: number) => sides.flatMap((s) => s?.players ?? []).find((p) => p.userId === osuId)?.username ?? String(osuId);
  const bgcc6 = isBGCC6();

  // players the scoreboard leaves out (never scored, or set to 0) still get a row, so a score can be given back
  const maps = (sb?.maps.filter((m) => !m.note) ?? []).map((m) => {
    const there = new Set(m.players.flat().map((p) => p.id));
    const gone = new Map(edits.filter((e) => e.gameId === m.gameId && e.removed).map((e) => [e.osuId, e]));
    const blank = (osuId: number, name: string, avatar: string): PlayerLine => ({ id: osuId, name, avatar, score: 0, acc: 0, combo: 0, miss: 0, mods: m.mods, rank: "", ...(gone.has(osuId) && { edited: true }) });
    const players = m.players.map((lines, k) => {
      const roster = (sides[k]?.players ?? []).filter((p) => !there.has(p.userId)).map((p) => blank(p.userId, p.username, p.avatar));
      const rest = [...gone.values()]
        .filter((e) => e.team === k + 1 && !there.has(e.osuId) && !roster.some((r) => r.id === e.osuId))
        .map((e) => blank(e.osuId, nameOf(e.osuId), avatarPath(e.osuId)));
      return [...lines, ...roster, ...rest];
    }) as MapResult["players"];
    return { m: { ...m, players }, multi: multiPick(m.mod, bgcc6) };
  });

  return (
    <>
      <Link href="/admin/matches" className="in-left mb-4 inline-flex items-center gap-1.5 text-xs font-display font-bold text-ash hover:text-paper">
        <ArrowLeft className="size-3.5" /> {t.admin.ms.back}
      </Link>
      <PageTitle mark="swords" right={sb && <span className="num text-3xl text-paper">{sb.score.join(" - ")}</span>}>
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
        <ScoreEditor id={id} wiped={wiped} stamp={editsStamp(edits)} firstTo={firstToOf(stages, match.stage)} names={[sides[0]?.name ?? t.common.tbd, sides[1]?.name ?? t.common.tbd]} maps={maps} />
      )}
    </>
  );
}
