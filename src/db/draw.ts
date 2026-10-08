import "server-only";
import { randomInt } from "node:crypto";
import { eq, ne, notLike } from "drizzle-orm";
import { isTestTeam, TEST_MATCH } from "@/lib/format";
import { db } from "./index";
import { drafts, matchCache, matches, pickems, teamMembers, teams } from "./schema";
import { getFormat } from "./edition";
import { getRegistrations } from "./registrations";
import { rankBws } from "@/lib/bws";

export const shuffle = <T>(a: T[]) => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const newTeamId = () => `team_${crypto.randomUUID().slice(0, 8)}`;

export async function seedBracket() {
  const f = getFormat();
  if (f.edition !== "bgcc7") return null;
  const [regs, all, members] = await Promise.all([getRegistrations(), db.select().from(teams), db.select().from(teamMembers)]);
  const ts = all.filter((t) => !isTestTeam(t.id));
  if (ts.length !== f.teams) return null;
  const pos = new Map(
    rankBws(regs.filter((r) => r.status === "approved"))
      .filter((p) => p.bws !== null)
      .map((p, i) => [p.osuId, i + 1]),
  );
  const seeds = (teamId: string) => members.filter((m) => m.teamId === teamId).map((m) => pos.get(m.osuId) ?? 999);
  const order = ts
    .map((t) => {
      const s = seeds(t.id);
      return { t, avg: s.length ? s.reduce((a, b) => a + b, 0) / s.length : 999, best: Math.min(...s, 999) };
    })
    .sort((a, b) => a.avg - b.avg || a.best - b.best);
  await db.transaction(async (tx) => {
    await tx.delete(drafts).where(ne(drafts.matchId, TEST_MATCH.id));
    await tx.delete(matchCache);
    await tx.delete(pickems);
    await tx.update(matches).set({ team1Id: null, team2Id: null, score1: null, score2: null, winner: null, manual: false }).where(ne(matches.id, TEST_MATCH.id));
    for (const [k, { t }] of order.entries()) await tx.update(teams).set({ seed: k + 1 }).where(eq(teams.id, t.id));
    for (const [k, [s1, s2]] of f.r1.entries()) await tx.update(matches).set({ team1Id: order[s1 - 1].t.id, team2Id: order[s2 - 1].t.id }).where(eq(matches.id, `WB-R1-M${k + 1}`));
  });
  return order.map(({ t, avg }, k) => `#${k + 1} ${t.name} (${avg})`).join(", ");
}

export async function drawSuiji() {
  const f = getFormat();
  if (f.edition !== "bgcc7") return null;
  const regs = await getRegistrations();
  const ranked = rankBws(regs.filter((r) => r.status === "approved")).filter((p) => p.bws !== null);
  const n = f.teams;
  if (ranked.length < n * f.teamSize) return null;
  const top = shuffle(ranked.slice(0, n));
  const low = shuffle(ranked.slice(n, 2 * n));
  await db.transaction(async (tx) => {
    await tx.delete(teams).where(notLike(teams.id, "test-%"));
    for (const [k, a] of top.entries()) {
      const id = newTeamId();
      await tx.insert(teams).values({ id, name: `Team ${a.username}` });
      await tx.insert(teamMembers).values([
        { osuId: a.osuId, teamId: id, isCaptain: true },
        { osuId: low[k].osuId, teamId: id, isCaptain: false },
      ]);
    }
  });
  return seedBracket();
}
