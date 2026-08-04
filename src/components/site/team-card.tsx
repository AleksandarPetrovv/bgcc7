import Link from "next/link";
import { Crown } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { type Team, fmtNum, flagUrl } from "@/lib/data";
import { Tag } from "./page";

export function Roster({ team }: { team: Team }) {
  return (
    <div className="w-64">
      <div className="heading-slam mb-2 border-b border-rose pb-1 text-lg">{team.name}</div>
      <ul className="space-y-1.5">
        {team.players.map((p) => (
          <li key={p.userId} className="flex items-center gap-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" className="size-6" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(p.country)} alt="" className="h-2.5" />
            <span className="font-bold">{p.username}</span>
            {p.isCaptain && <Crown className="size-3.5 text-[#e8c547]" />}
            <span className="num ml-auto text-ash">#{fmtNum(p.rank)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TeamCard({ team }: { team: Team }) {
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        render={
          <Link href={`/teams/${team.id}`} className="group block overflow-hidden bg-paper text-ink outline-offset-4">
            <div className="relative h-32 overflow-hidden bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={team.image} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="num absolute left-0 top-0 bg-ink px-2 py-0.5 text-sm text-paper">SEED {team.seed}</span>
            </div>
            <div className="border-t-2 border-rose px-3.5 pb-2 pt-1.5">
              <div className="truncate text-xl font-black leading-tight">{team.name}</div>
              <div className="mt-0.5 flex items-center gap-2">
                <Tag>Avg rank</Tag>
                <span className="num text-2xl leading-none">{fmtNum(team.avgRank)}</span>
                <Tag tone="balkan" className="ml-auto">Avg pp</Tag>
                <span className="num text-2xl leading-none">{fmtNum(team.avgPp)}</span>
              </div>
            </div>
          </Link>
        }
      />
      <HoverCardContent side="right" align="start" className="w-auto rounded-none border border-balkan bg-ink p-3 text-paper ring-0">
        <Roster team={team} />
      </HoverCardContent>
    </HoverCard>
  );
}
