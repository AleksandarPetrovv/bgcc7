import { getAllMatches, getAllTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getScoreboard } from "@/db/scoreboards";
import { TEST_MATCH } from "@/lib/format";
import { draftAccess } from "@/db/drafts";

export async function GET(_: Request, { params }: RouteContext<"/api/matches/[id]">) {
  const { id } = await params;
  const [matches, teams, stages] = await Promise.all([getAllMatches(), getAllTeams(), getPoolStages()]);
  const match = matches.find((m) => m.id === id);
  if (!match || !match.links.length || (match.id === TEST_MATCH.id && !(await draftAccess(match.id)))) return Response.json({ error: "not found" }, { status: 404 });
  const data = await getScoreboard(match, teams, stages);
  return data ? Response.json(data) : Response.json({ error: "upstream" }, { status: 502 });
}
