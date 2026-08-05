"use client";

import { useState } from "react";
import { Crown, Mail } from "lucide-react";
import { useDict } from "./lang";
import { type Team, fmtNum, flagUrl } from "@/lib/data";

export function ManageRoster({ team }: { team: Team }) {
  const t = useDict();
  const [players, setPlayers] = useState(team.players);
  const [invite, setInvite] = useState(true);
  return (
    <div className="border border-line bg-coal">
      <div className="flex items-center gap-4 border-b border-line p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className="size-16 object-cover" />
        <div className="min-w-0">
          <div className="heading-slam truncate text-3xl">{team.name}</div>
          <div className="text-xs font-bold uppercase text-ash">{t.teams.locks}</div>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {players.map((p) => (
          <li key={p.userId} className="flex items-center gap-3 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" className="size-10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(p.country)} alt="" className="h-3" />
            <span className="font-bold">{p.username}</span>
            {p.isCaptain && <Crown className="size-4 text-[#d4a72c]" aria-label={t.common.captain} />}
            <span className="num ml-auto text-ash">#{fmtNum(p.rank)}</span>
            {!p.isCaptain && (
              <button
                type="button"
                onClick={() => setPlayers(players.filter((x) => x.userId !== p.userId))}
                className="text-xs font-black uppercase text-rose-hi hover:underline"
              >
                {t.teams.remove}
              </button>
            )}
          </li>
        ))}
        {invite && (
          <li className="flex items-center gap-3 px-4 py-3 text-ash">
            <Mail className="size-5" />
            <span className="text-sm font-bold">{t.teams.subInvited}</span>
            <button type="button" onClick={() => setInvite(false)} className="ml-auto text-xs font-black uppercase text-paper hover:underline">
              {t.teams.cancelInvite}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
