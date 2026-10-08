import { eq } from "drizzle-orm";
import { db } from "@/db";
import { registrations, teamMembers, teams, users } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getFormat } from "@/db/edition";

const clean = (s: string) => s.replace(/[,\r\n]/g, " ").trim();

export async function GET(req: Request) {
  try {
    await requireRole("screening");
  } catch {
    return new Response("forbidden", { status: 403 });
  }
  const withTeams = new URL(req.url).searchParams.get("teams") === "1";
  let lines: string[];
  if (withTeams) {
    const rows = await db
      .select({ name: users.username, id: users.osuId, team: teams.name, seed: teams.seed })
      .from(teamMembers)
      .innerJoin(users, eq(users.osuId, teamMembers.osuId))
      .innerJoin(teams, eq(teams.id, teamMembers.teamId));
    lines = rows.sort((a, b) => a.seed - b.seed || a.team.localeCompare(b.team)).map((r) => `${clean(r.name)},${clean(r.team)},${r.id}`);
  } else {
    const rows = await db
      .select({ name: users.username, id: users.osuId, status: registrations.status })
      .from(registrations)
      .innerJoin(users, eq(users.osuId, registrations.osuId));
    lines = rows.filter((r) => r.status !== "denied").map((r) => `${clean(r.name)},${r.id}`);
  }
  const tag = getFormat().name.toLowerCase();
  const file = withTeams ? `${tag}-screening-teams.txt` : `${tag}-screening.txt`;
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" },
  });
}
