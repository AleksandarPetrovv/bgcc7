"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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

export function ScheduleView({ sheets, top, live = {} }: { sheets?: string; top?: React.ReactNode; live?: Record<string, [number, number] | null> }) {
  const t = useDict();
  const router = useRouter();
  const anyLive = Object.keys(live).length > 0;
  useEffect(() => {
    if (!anyLive) return;
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [anyLive, router]);
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
        <motion.div layout className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((m, k) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: Math.min(k, 8) * 0.04, ease: [0.16, 1, 0.3, 1] } }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              >
                <MatchRow match={m} live={m.id in live ? live[m.id] : undefined} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <p className="py-10 text-center text-ash">{t.common.noResults}</p>
      )}
    </Container>
  );
}
