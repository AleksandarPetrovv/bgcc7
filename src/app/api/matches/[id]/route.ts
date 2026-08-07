import { allMatches } from "@/lib/data";
import { buildScoreboard, type Scoreboard } from "@/lib/scoreboard";

const cache = new Map<string, { at: number; data: Scoreboard }>();

export async function GET(_: Request, { params }: RouteContext<"/api/matches/[id]">) {
  const { id } = await params;
  const match = allMatches.find((m) => m.id === id);
  if (!match || !match.links.length) return Response.json({ error: "not found" }, { status: 404 });

  const ttl = match.winner ? 6 * 3_600_000 : 120_000;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < ttl) return Response.json(hit.data);

  try {
    const data = await buildScoreboard(match);
    cache.set(id, { at: Date.now(), data });
    return Response.json(data);
  } catch (e) {
    console.error("[match]", id, e);
    if (hit) return Response.json(hit.data);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
