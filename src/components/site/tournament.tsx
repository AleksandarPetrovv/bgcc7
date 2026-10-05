"use client";

import { createContext, useContext, useMemo } from "react";
import type { Match, Team } from "@/lib/data";
import { FORMATS, type Edition, type Format } from "@/lib/format";

type Ctx = { teams: Team[]; matches: Match[]; format: Format; teamById: (id: string) => Team | undefined; matchById: (id: string) => Match | undefined };

const TournamentContext = createContext<Ctx>({ teams: [], matches: [], format: FORMATS.bgcc6, teamById: () => undefined, matchById: () => undefined });

export function TournamentProvider({ teams, matches, edition, children }: { teams: Team[]; matches: Match[]; edition: Edition; children: React.ReactNode }) {
  const value = useMemo(() => {
    const t = new Map(teams.map((x) => [x.id, x]));
    const m = new Map(matches.map((x) => [x.id, x]));
    return { teams, matches, format: FORMATS[edition], teamById: (id: string) => t.get(id), matchById: (id: string) => m.get(id) };
  }, [teams, matches, edition]);
  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export const useTournament = () => useContext(TournamentContext);
export const useFormat = () => useContext(TournamentContext).format;
