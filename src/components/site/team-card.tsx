"use client";

import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { type Team, fmtNum, teamHref } from "@/lib/data";
import { useDict } from "./lang";
import { MeTag, meT } from "./me";
import { Pic } from "./pfp";
import { PlayerRow } from "./player-row";
import { RuleDiamond } from "./rule";

export function Roster({ team }: { team: Team }) {
  return (
    <div className="w-64">
      <div className="heading-slam mb-2 text-lg">{team.name}</div>
      <ul className="space-y-1.5">
        {team.players.map((p) => (
          <PlayerRow
            key={p.userId}
            id={p.userId}
            hl
            avatar={p.avatar}
            pfpClass="size-6 ring-1 ring-offset-1"
            country={p.country}
            captain={p.isCaptain}
            className="gap-2 px-1 py-0.5 text-sm"
            end={<span className="num ml-auto text-ash">#{fmtNum(p.rank)}</span>}
          >
            <span className="font-display font-bold">{p.username}</span>
            <MeTag p={p.userId} />
          </PlayerRow>
        ))}
      </ul>
    </div>
  );
}

export function TeamCard({ team }: { team: Team }) {
  const t = useDict();
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={
          <Link href={teamHref(team)} {...meT(team.id)} className="group relative flex border-b-2 border-dashed border-line outline-offset-4 transition-colors hover:border-balkan sm:block">
            <MeTag t={team.id} corner className="me-corner-lg" />
            <RuleDiamond className="transition-colors group-hover:bg-balkan" />
            <div className="relative shrink-0 self-center py-2.5 pl-2.5 sm:px-3.5 sm:pb-0 sm:pt-3.5">
              <Pic src={team.image} className="in-wipe size-20 rounded-full object-cover transition duration-500 group-hover:brightness-110 sm:size-24 [--d:0.1s]" />
              <span className="in-pop num absolute bottom-2 left-1.5 flex size-7 origin-bottom-left items-center justify-center bg-ink text-base sm:bottom-0 sm:left-2.5 sm:size-9 sm:text-xl text-paper [--d:0.45s]" aria-label={`${t.common.seed} ${team.seed}`}>
                {team.seed}
              </span>
            </div>
            <div className="min-w-0 flex-1 px-3.5 pb-3 pt-2">
              <div className="in-left truncate text-lg font-display font-black sm:text-xl leading-tight [--d:0.3s]">{team.name}</div>
              <dl className="in-up mt-1.5 flex gap-5 text-[0.65rem] font-display font-bold text-ash [--d:0.45s]">
                <div>
                  <dt>{t.common.avgRank}</dt>
                  <dd className="num text-xl leading-none text-paper">#{fmtNum(team.avgRank)}</dd>
                </div>
                <div>
                  <dt>{t.common.avgPp}</dt>
                  <dd className="num text-xl leading-none text-paper">{fmtNum(team.avgPp)}</dd>
                </div>
              </dl>
              <div className="mt-1.5 truncate text-xs text-ash sm:hidden">{team.players.map((p) => p.username).join(" · ")}</div>
            </div>
          </Link>
        }
      />
      <HoverCardContent side="right" align="start" className="w-auto rounded-none border border-line bg-coal p-3 text-paper ring-0">
        <Roster team={team} />
      </HoverCardContent>
    </HoverCard>
  );
}
