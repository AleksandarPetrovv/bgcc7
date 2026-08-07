"use client";

import { useState } from "react";
import { Sheet } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { MatchRow } from "@/components/site/match-row";
import { useDict } from "@/components/site/lang";
import { TeamSearch } from "@/components/site/team-grid";
import { bracket, teamById, type Match } from "@/lib/data";

const ROUNDS = [
  { title: "Quarterfinals", matches: [...bracket.winners[0].matches] },
  { title: "Semifinals", matches: [...bracket.winners[1].matches, ...bracket.losers[0].matches, ...bracket.losers[1].matches] },
  { title: "Finals", matches: [...bracket.winners[2].matches, ...bracket.losers[2].matches, ...bracket.losers[3].matches] },
  { title: "Grand Finals", matches: [...bracket.grand[0].matches] },
];

const CURRENT = Math.max(0, ROUNDS.findIndex((r) => r.matches.some((m) => m.winner === null)));
const LOCKED = ROUNDS.map((_, i) => i).filter((i) => i > CURRENT);

const norm = (s: string) => s.toLowerCase().trim();
const matches = (m: Match, q: string) =>
  [m.team1, m.team2].some((side) => {
    const team = teamById(side.id);
    return norm(team?.name ?? side.name ?? "").includes(q) || !!team?.players.some((p) => norm(p.username).includes(q));
  });

export default function Schedule() {
  const t = useDict();
  const [i, setI] = useState(CURRENT);
  const [q, setQ] = useState("");
  const query = norm(q);
  const shown = query ? ROUNDS.slice(0, CURRENT + 1).flatMap((x) => x.matches).filter((m) => matches(m, query)) : ROUNDS[i].matches;
  return (
    <Container>
      <PageTitle>{t.schedule.title}</PageTitle>
      <div className="-mt-2 mb-8 flex flex-wrap items-center gap-4">
        <StageTabs options={ROUNDS.map((x) => t.rounds[x.title])} index={i} onChange={setI} locked={LOCKED} />
        <TeamSearch value={q} onChange={setQ} />
        <SlantButton tone="rose" className="px-3 py-1.5">
          <Sheet className="size-4" /> {t.common.sheets}
        </SlantButton>
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
