"use server";

import { db, isBGCC6 } from "@/db";
import { matches, teamMembers, teams } from "@/db/schema";
import { newTeamId } from "@/db/draw";
import { getQualResults } from "@/db/qualifiers";
import { getSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import { resetPickems } from "@/db/pickems";

// bgcc6 only, like the teams panel that posts here
export async function generateTeams() {
  return guard("teams", "teams.generate", async () => {
    if (!isBGCC6()) return { ok: false, error: "invalid" };
    const [{ players }, settings] = await Promise.all([getQualResults(), getSettings()]);
    const size = Math.floor(settings.qualifyCount / 3);
    const top = players.slice(0, size * 3);
    if (top.length < 6) return { ok: false, error: "invalid" };
    const n = Math.floor(top.length / 3);
    await db.transaction(async (tx) => {
      await tx.update(matches).set({ team1Id: null, team2Id: null, score1: null, score2: null, winner: null, manual: false });
      await tx.delete(teams);
      for (let k = 0; k < n; k++) {
        const picks = [top[k], top[2 * n - 1 - k], top[2 * n + k]].filter(Boolean);
        const id = newTeamId();
        await tx.insert(teams).values({ id, name: picks[0].username, seed: k + 1 });
        for (const [i, p] of picks.entries()) await tx.insert(teamMembers).values({ osuId: p.id, teamId: id, isCaptain: i === 0 });
      }
    });
    await resetPickems();
    return { log: { teams: n } };
  });
}
