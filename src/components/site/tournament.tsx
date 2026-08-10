"use client";

import { createContext, useContext, useMemo } from "react";
import type { Match, Team } from "@/lib/data";

type Ctx = { teams: Team[]; matches: Match[]; teamById: (id: string) => Team | undefined; matchById: (id: string) => Match | undefined };

const TournamentContext = createContext<Ctx>({ teams: [], matches: [], teamById: () => undefined, matchById: () => undefined });

export function TournamentProvider({ teams, matches, children }: { teams: Team[]; matches: Match[]; children: React.ReactNode }) {
  const value = useMemo(() => {
    const t = new Map(teams.map((x) => [x.id, x]));
    const m = new Map(matches.map((x) => [x.id, x]));
    return { teams, matches, teamById: (id: string) => t.get(id), matchById: (id: string) => m.get(id) };
  }, [teams, matches]);
  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export const useTournament = () => useContext(TournamentContext);
