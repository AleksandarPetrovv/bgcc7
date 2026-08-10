import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matchCache } from "@/db/schema";
import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { buildScoreboard, poolOf, type Scoreboard } from "@/lib/scoreboard";
const LIVE_TTL = 30_000;
const live = new Map<string, { at: number; data: Scoreboard }>();

async function stored(id: string, links: string) {
  try {
    const [row] = await db.select().from(matchCache).where(eq(matchCache.matchId, id)).limit(1);
    return row && row.links === links ? (row.data as Scoreboard) : null;
  } catch (e) {
    console.error("[match cache]", e);
    return null;
  }
}

export async function GET(_: Request, { params }: RouteContext<"/api/matches/[id]">) {
  const { id } = await params;
  const [matches, teams, stages] = await Promise.all([getMatches(), getTeams(), getPoolStages()]);
  const match = matches.find((m) => m.id === id);
  const firstTo = stages.find((s) => s.slug === match?.stage)?.firstTo ?? 7;
  if (!match || !match.links.length) return Response.json({ error: "not found" }, { status: 404 });
  const links = match.links.join(",");

  const saved = await stored(id, links);
  if (saved) return Response.json(saved);

  const hit = live.get(id);
  if (hit && Date.now() - hit.at < LIVE_TTL) return Response.json(hit.data);

  try {
    const data = await buildScoreboard(match, teams, poolOf(stages, match.stage));
    if (Math.max(...data.score) >= firstTo) {
      await db
        .insert(matchCache)
        .values({ matchId: id, links, data })
        .onConflictDoUpdate({ target: matchCache.matchId, set: { links, data, createdAt: new Date() } })
        .catch((e) => console.error("[match cache]", e));
      live.delete(id);
    } else live.set(id, { at: Date.now(), data });
    return Response.json(data);
  } catch (e) {
    console.error("[match]", id, e);
    if (hit) return Response.json(hit.data);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
