"use client";

import { useState } from "react";
import { PageTitle } from "./page";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TeamCard } from "./team-card";
import { useDict } from "./lang";
import { useTournament } from "./tournament";

const norm = (s: string) => s.toLowerCase().trim();

export function TeamSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useDict();
  return (
    <label className="flex items-center gap-2 border border-line px-3 focus-within:border-balkan">
      <Search className="size-4 text-ash" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t.common.searchLabel}
        placeholder={t.common.search}
        className="h-10 w-56 bg-transparent text-sm outline-none placeholder:text-ash"
      />
    </label>
  );
}

export function TeamGrid({ title }: { title: string }) {
  const t = useDict();
  const { teams } = useTournament();
  const [q, setQ] = useState("");
  const shown = teams.filter(
    (team) => !q || norm(team.name).includes(norm(q)) || team.players.some((p) => norm(p.username).includes(norm(q))),
  );
  return (
    <>
      <PageTitle right={<TeamSearch value={q} onChange={setQ} />}>{title}</PageTitle>
      {shown.length ? (
        <motion.div layout className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {shown.map((team, k) => (
              <motion.div
                key={team.id}
                style={{ "--i": Math.min(k, 12), "--s": "0.05s" } as React.CSSProperties}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, delay: Math.min(k, 12) * 0.04, ease: [0.16, 1, 0.3, 1] } }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              >
                <TeamCard team={team} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <p className="py-10 text-center text-ash">{t.common.noResults}</p>
      )}
    </>
  );
}
