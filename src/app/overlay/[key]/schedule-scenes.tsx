"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MatchBracket } from "@/components/site/match-bracket";
import { MatchRow } from "@/components/site/match-row";
import { BracketOptions, ResultsEye } from "@/components/site/overlay-context";
import { useDict } from "@/components/site/lang";
import { useTournament } from "@/components/site/tournament";
import type { Match } from "@/lib/data";
import { cardLabels, recentResults } from "@/lib/matches";
import type { OverlayFeed } from "@/lib/overlay-types";
import { Backdrop, Echo, editionNum, Lockup, Rule, TopBar } from "./chrome";

function useFresh() {
  const router = useRouter();
  useEffect(() => router.refresh(), [router]);
}

function Column({ title, list }: { title: string; list: Match[] }) {
  const t = useDict();
  const { format: f } = useTournament();
  return (
    <section className="flex min-w-0 flex-col">
      <h2 className="heading-slam border-b border-line pb-3 text-[30px]">{title}</h2>
      <div className="mt-5 flex flex-col gap-3">
        {list.map((m, i) => (
          <MatchRow key={m.id} match={m} small label={cardLabels(f, t, m)} live={m.running ? null : undefined} delay={0.2 + i * 0.06} />
        ))}
      </div>
    </section>
  );
}

const ROWS = 5;

export function ScheduleScene({ feed }: { feed: OverlayFeed }) {
  useFresh();
  const { matches } = useTournament();
  const done = recentResults(matches).slice(0, ROWS);
  const pending = matches.filter((m) => !m.winner && (m.team1.id || m.team2.id));
  const next = [...pending.filter((m) => m.datetime).sort((a, b) => a.datetime!.localeCompare(b.datetime!)), ...pending.filter((m) => !m.datetime)].slice(0, ROWS);
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint="var(--rose)" />
      <TopBar feed={feed} />
      <div className="absolute inset-x-[72px] top-[130px] pb-6">
        <Echo text="Schedule" className="text-[84px]" />
        <Rule className="absolute inset-x-0 bottom-0" />
      </div>
      <div className="absolute inset-x-[72px] top-[290px] grid grid-cols-2 gap-16">
        <ResultsEye value={false}>
          <Column title="Up next" list={next} />
          <Column title="Results" list={done} />
        </ResultsEye>
      </div>
    </div>
  );
}

const TOP = 24;
const BOTTOM = 16;

export function BracketScene({ feed }: { feed: OverlayFeed }) {
  useFresh();
  const { id, score, firstTo } = feed.match;
  // the reset only matters on a grand final once the losers-side team (slot 2) has taken the first set
  const reset = id === "grand-final-reset" || (id === "grand-final" && score[1] >= firstTo);
  return (
    <div className="absolute inset-0 overflow-hidden text-paper">
      <Backdrop num={editionNum(feed)} tint="var(--white)" />
      <Lockup num={editionNum(feed)} size={38} className="absolute right-[56px] top-[40px]" />
      <div className="absolute inset-x-[40px] [&_.bsec-l]:text-inherit [&_.bsec-u]:text-rose-hi" style={{ top: TOP, bottom: BOTTOM }}>
        <ResultsEye value={false}>
          <BracketOptions value={{ reset, maxH: 1080 - TOP - BOTTOM - 16 }}>
            <MatchBracket />
          </BracketOptions>
        </ResultsEye>
      </div>
    </div>
  );
}
