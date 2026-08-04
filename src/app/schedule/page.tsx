"use client";

import { useState } from "react";
import { Search, Sheet } from "lucide-react";
import { Container, PageTitle, SlantButton, StageTabs } from "@/components/site/page";
import { MatchRow } from "@/components/site/match-row";
import { useDict } from "@/components/site/lang";
import { bracket } from "@/lib/data";

const ROUNDS = [
  { title: "Quarterfinals", matches: [...bracket.winners[0].matches] },
  { title: "Semifinals", matches: [...bracket.winners[1].matches, ...bracket.losers[0].matches, ...bracket.losers[1].matches] },
  { title: "Finals", matches: [...bracket.winners[2].matches, ...bracket.losers[2].matches, ...bracket.losers[3].matches] },
  { title: "Grand Finals", matches: [...bracket.grand[0].matches] },
];

export default function Schedule() {
  const t = useDict();
  const [i, setI] = useState(0);
  const r = ROUNDS[i];
  return (
    <Container>
      <PageTitle>{t.schedule.title}</PageTitle>
      <div className="-mt-2 mb-8 flex flex-wrap items-center gap-4">
        <StageTabs options={ROUNDS.map((x) => t.rounds[x.title])} index={i} onChange={setI} />
        <label className="flex items-center gap-2 border border-line px-3">
          <Search className="size-4 text-ash" />
          <input type="search" aria-label={t.common.searchLabel} placeholder={t.common.search} className="h-10 w-56 bg-transparent text-sm outline-none placeholder:text-ash" />
        </label>
        <SlantButton tone="rose" className="px-3 py-1.5">
          <Sheet className="size-4" /> {t.common.sheets}
        </SlantButton>
      </div>
      <div className="space-y-4">
        {r.matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </div>
    </Container>
  );
}
