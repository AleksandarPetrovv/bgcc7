"use client";

import { motion } from "motion/react";
import { PageTitle } from "./page";
import { TeamCard } from "./team-card";
import { useDict } from "./lang";
import { useTournament } from "./tournament";

export function TeamGrid({ title }: { title: string }) {
  const t = useDict();
  const { teams } = useTournament();
  return (
    <>
      <PageTitle mark="blocks">{title}</PageTitle>
      {teams.length ? (
        <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team, k) => (
            <motion.div
              key={team.id}
              style={{ "--i": Math.min(k, 12), "--s": "0.05s" } as React.CSSProperties}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, delay: Math.min(k, 12) * 0.04, ease: [0.16, 1, 0.3, 1] } }}
            >
              <TeamCard team={team} />
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-ash">{t.common.noResults}</p>
      )}
    </>
  );
}
