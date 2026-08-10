"use client";

import { useState } from "react";
import { Search } from "lucide-react";
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

export function TeamGrid({ title }: { title: React.ReactNode }) {
  const t = useDict();
  const { teams } = useTournament();
  const [q, setQ] = useState("");
  const shown = teams.filter(
    (team) => !q || norm(team.name).includes(norm(q)) || team.players.some((p) => norm(p.username).includes(norm(q))),
  );
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-line pb-3">
        {title}
        <div className="ml-auto">
          <TeamSearch value={q} onChange={setQ} />
        </div>
      </div>
      {shown.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-ash">{t.common.noResults}</p>
      )}
    </>
  );
}
