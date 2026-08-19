import { requireSection } from "@/lib/authz";
import { Sheet } from "lucide-react";
import { Container, PageTitle, SlantButton, Wide } from "@/components/site/page";
import { MatchBracket } from "@/components/site/match-bracket";
import { RescheduleBox, type RescheduleItem } from "./reschedule-box";
import { getSettings } from "@/db/settings";
import { currentOsuId } from "@/auth";
import { getMatches, getMatchRows, getTeams } from "@/db/tournament";
import { getPoolStages } from "@/db/mappools";
import { getLiveScores } from "@/db/scoreboards";
import { getReschedules, OPEN } from "@/db/reschedules";
import { getDict, getLang } from "@/lib/i18n/server";
import { fmtSofia, isPast, rescheduleDeadline } from "@/lib/time";

async function myItems(): Promise<RescheduleItem[]> {
  const osuId = await currentOsuId();
  if (!osuId) return [];
  const [teams, rows, requests, lang] = await Promise.all([getTeams(), getMatchRows(), getReschedules(), getLang()]);
  const team = teams.find((x) => x.players.some((p) => p.userId === osuId));
  if (!team) return [];
  const locale = lang === "bg" ? "bg-BG" : "en-GB";
  const fmt = (d: Date) => `${fmtSofia(d, locale)} EET`;
  return rows
    .filter((m) => !m.winner && m.team1Id && m.team2Id && (m.team1Id === team.id || m.team2Id === team.id))
    .map((m) => {
      const other = m.team1Id === team.id ? m.team2Id : m.team1Id;
      const reqs = requests.filter((r) => r.matchId === m.id);
      const open = reqs.find((r) => OPEN.includes(r.status));
      const last = reqs.find((r) => !OPEN.includes(r.status));
      const deadline = m.startsAt ? rescheduleDeadline(m.startsAt) : null;
      return {
        matchId: m.id,
        round: m.round,
        opponent: teams.find((x) => x.id === other)?.name ?? "?",
        when: m.startsAt ? fmt(m.startsAt) : null,
        deadline: deadline ? fmt(deadline) : null,
        closed: isPast(deadline),
        open: open
          ? { id: open.id, own: open.teamId === team.id, status: open.status as "pending" | "accepted", proposed: fmt(open.proposedAt), reason: open.reason }
          : null,
        last: last ? { status: last.status, proposed: fmt(last.proposedAt) } : null,
      };
    });
}

export default async function Matches() {
  await requireSection("schedule");
  const [t, settings, items, matches, teams, stages] = await Promise.all([getDict(), getSettings(), myItems(), getMatches(), getTeams(), getPoolStages()]);
  const live = await getLiveScores(matches, teams, stages);
  return (
    <Container plain>
      <PageTitle mark="chevrons"
        right={
          <>
            {settings.links.sheets && (
              <SlantButton tone="rose" href={settings.links.sheets} className="px-3 py-1.5">
                <Sheet className="size-4" /> {t.common.sheets}
              </SlantButton>
            )}
          </>
        }
      >
        {t.schedule.title}
      </PageTitle>
      <RescheduleBox items={items} />
      <Wide full>
        <MatchBracket live={live} />
      </Wide>
    </Container>
  );
}
