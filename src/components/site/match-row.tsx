"use client";

import Link from "next/link";
import { type Match, fmtNum } from "@/lib/data";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { sourceLabel } from "@/lib/matches";
import { MatchDialog } from "./match-dialog";
import { cn } from "@/lib/utils";

function when(dt: string | null, locale: string) {
  if (!dt) return null;
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString(locale, { timeZone: "Europe/Sofia", day: "2-digit", month: "short", weekday: "short" }),
    time: d.toLocaleTimeString("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

function Side({ id, placeholder, flip }: { id: string; placeholder: string; flip?: boolean }) {
  const t = useDict();
  const { teamById } = useTournament();
  const team = teamById(id);
  return (
    <div className={cn("flex min-w-0 flex-1 items-stretch", flip && "flex-row-reverse")}>
      <div className="relative hidden w-24 shrink-0 overflow-hidden bg-ink md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team && <img src={team.image} alt="" className="absolute inset-0 size-full object-cover" />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col justify-center bg-slate/60 px-2.5 py-3 sm:px-4", flip && "items-end text-right")}>
        {team ? (
          <Link href={`/teams/${team.id}`} className="block max-w-full truncate text-base font-black leading-tight hover:text-rose-hi sm:text-xl">
            {team.name}
          </Link>
        ) : (
          <span className="line-clamp-2 text-sm font-bold uppercase leading-tight text-ash sm:text-base">{placeholder}</span>
        )}
        {team && (
          <div className="mt-1 hidden gap-4 text-[0.65rem] font-bold uppercase text-ash sm:flex">
            <span>
              {t.common.seed} <span className="num text-base text-paper">{team.seed}</span>
            </span>
            <span>
              {t.common.avgRank} <span className="num text-base text-paper">#{fmtNum(team.avgRank)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MatchRow({ match }: { match: Match }) {
  const t = useDict();
  const lang = useLang();
  const { matches } = useTournament();
  const w = when(match.datetime, lang === "bg" ? "bg-BG" : "en-GB");
  const played = match.winner !== null;
  return (
    <div className="flex h-24 items-stretch border border-line bg-coal">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center px-1 py-3 text-center sm:w-32">
        <span className="num text-sm uppercase text-paper/80">{w?.date ?? t.common.tbd}</span>
        <span className="num text-2xl leading-none sm:text-4xl">{w?.time ?? "--:--"}</span>
        <span className="text-[0.6rem] font-black text-rose-hi">{t.common.eet}</span>
      </div>
      <Side id={match.team1.id} placeholder={sourceLabel(t, matches, match.id, 1)} />
      <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 bg-ink py-3 sm:w-20">
        {played ? (
          <span className="num text-xl sm:text-2xl">
            <span className={cn(match.winner === 1 ? "text-paper" : "text-ash")}>{match.team1.score ?? 0}</span>
            <span className="text-ash">-</span>
            <span className={cn(match.winner === 2 ? "text-paper" : "text-ash")}>{match.team2.score ?? 0}</span>
          </span>
        ) : (
          <span className="heading-slam text-lg text-rose-hi sm:text-2xl">{t.common.vs}</span>
        )}
      </div>
      <Side id={match.team2.id} placeholder={sourceLabel(t, matches, match.id, 2)} flip />
      {match.links.length > 0 ? (
        <MatchDialog match={match} />
      ) : (
        <span className="hidden w-14 shrink-0 sm:block" aria-hidden />
      )}
    </div>
  );
}
