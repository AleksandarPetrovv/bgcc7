"use client";

import { useState } from "react";
import { Search, Sheet } from "lucide-react";
import { Container, PageTitle, SlantButton, StageSelect } from "@/components/site/page";
import { MatchRow } from "@/components/site/match-row";
import { bracket } from "@/lib/data";

const ROUNDS = [
  { label: "QF", title: "Quarterfinals", matches: [...bracket.winners[0].matches] },
  { label: "SF", title: "Semifinals", matches: [...bracket.winners[1].matches, ...bracket.losers[0].matches, ...bracket.losers[1].matches] },
  { label: "F", title: "Finals", matches: [...bracket.winners[2].matches, ...bracket.losers[2].matches, ...bracket.losers[3].matches] },
  { label: "GF", title: "Grand finals", matches: [...bracket.grand[0].matches] },
];

export default function Schedule() {
  const [i, setI] = useState(0);
  const r = ROUNDS[i];
  return (
    <Container>
      <PageTitle accent={r.label}>Schedule</PageTitle>
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-5 border-b border-rose pb-4">
        <StageSelect
          label="Stage select"
          value={r.title}
          onPrev={() => setI((i + ROUNDS.length - 1) % ROUNDS.length)}
          onNext={() => setI((i + 1) % ROUNDS.length)}
        />
        <div className="flex items-center gap-2 border border-line px-3">
          <Search className="size-4 text-ash" />
          <input placeholder="Search for a player or team" className="h-10 w-56 bg-transparent text-sm outline-none placeholder:text-ash" />
        </div>
        <SlantButton tone="rose" className="px-3 py-1.5">
          <Sheet className="size-4" /> Sheets
        </SlantButton>
      </div>
      <div className="space-y-5">
        {r.matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </div>
    </Container>
  );
}
