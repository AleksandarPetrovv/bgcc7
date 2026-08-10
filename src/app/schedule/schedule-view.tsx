"use client";

import { useState } from "react";
import { Sheet } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { MatchRow } from "@/components/site/match-row";
import { useDict } from "@/components/site/lang";
import { TeamSearch } from "@/components/site/team-grid";
import type { Match, Team } from "@/lib/data";
import { useTournament } from "@/components/site/tournament";

const STAGES = [
  { title: "Quarterfinals", slug: "quarterfinals" },
  { title: "Semifinals", slug: "semifinals" },
  { title: "Finals", slug: "finals" },
  { title: "Grand Finals", slug: "grand-finals" },
];

const norm = (s: string) => s.toLowerCase().trim();
const hit = (m: Match, q: string, teamById: (id: string) => Team | undefined) =>
  [m.team1, m.team2].some((side) => {
    const team = teamById(side.id);
    return norm(team?.name ?? side.name ?? "").includes(q) || !!team?.players.some((p) => norm(p.username).includes(q));
  });

export function ScheduleView({ sheets, top }: { sheets?: string; top?: React.ReactNode }) {
  const t = useDict();
  const { matches: all, teamById } = useTournament();
  const ROUNDS = STAGES.map((s) => ({ title: s.title, matches: all.filter((m) => m.stage === s.slug) }));
  const CURRENT = Math.max(0, ROUNDS.findIndex((r) => r.matches.some((m) => m.winner === null)));
  const LOCKED = ROUNDS.map((_, i) => i).filter((i) => i > CURRENT);
  const [i, setI] = useState(CURRENT);
  const [q, setQ] = useState("");
  const query = norm(q);
  const shown = query ? ROUNDS.slice(0, CURRENT + 1).flatMap((x) => x.matches).filter((m) => hit(m, query, teamById)) : ROUNDS[i].matches;
  return (
    <Container>
      <PageTitle>{t.schedule.title}</PageTitle>
      {top}
      <div className="-mt-2 mb-8 flex flex-wrap items-center gap-4">
        <StageTabs options={ROUNDS.map((x) => t.rounds[x.title])} index={i} onChange={setI} locked={LOCKED} />
        <TeamSearch value={q} onChange={setQ} />
        {sheets && (
          <SlantButton tone="rose" href={sheets} className="px-3 py-1.5">
            <Sheet className="size-4" /> {t.common.sheets}
          </SlantButton>
        )}
      </div>
      {shown.length ? (
        <div className="space-y-4">
          {shown.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-ash">{t.common.noResults}</p>
      )}
    </Container>
  );
}
