import { getMatches, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getScoreboard } from "@/db/scoreboards";
import { getFormat } from "@/db/edition";
import { matchSlug } from "@/lib/format";

export async function GET(_: Request, { params }: RouteContext<"/api/matches/[id]">) {
  const { id } = await params;
  const [matches, teams, stages, f] = await Promise.all([getMatches(), getTeams(), getPoolStages(), getFormat()]);
  const match = matches.find((m) => matchSlug(f, m.id) === id);
  if (!match || !match.links.length) return Response.json({ error: "not found" }, { status: 404 });
  const data = await getScoreboard(match, teams, stages);
  return data ? Response.json(data) : Response.json({ error: "upstream" }, { status: 502 });
}
