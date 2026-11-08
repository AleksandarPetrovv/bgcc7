"use client";

import { PageTitle } from "./page-title";
import { TeamCard } from "./team-card";
import { useDict } from "./lang";
import { useTournament } from "./tournament";

export function TeamGrid({ title }: { title: string }) {
  const t = useDict();
  const { teams } = useTournament();
  return (
    <>
      <PageTitle mark="team">{title}</PageTitle>
      {teams.length ? (
        <div className="relative grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-x-8 2xl:gap-y-10">
          {teams.map((team, k) => (
            <div key={team.id} className="in-up" style={{ "--i": Math.min(k, 12), "--s": "0.05s", animationDuration: "0.55s" } as React.CSSProperties}>
              <TeamCard team={team} />
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-ash">{t.common.noResults}</p>
      )}
    </>
  );
}
