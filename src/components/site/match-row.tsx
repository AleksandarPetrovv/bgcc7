"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { type Match, teamById, fmtNum } from "@/lib/data";
import { useDict, useLang } from "./lang";
import { cn } from "@/lib/utils";

function when(dt: string | null, locale: string) {
  if (!dt) return null;
  const [d, t] = dt.split(" ");
  const [dd, mm, yyyy] = d.split("/").map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return { date: date.toLocaleDateString(locale, { day: "2-digit", month: "short", weekday: "short" }), time: t };
}

function Side({ id, name, flip }: { id: string; name: string; flip?: boolean }) {
  const t = useDict();
  const team = teamById(id);
  return (
    <div className={cn("flex min-w-0 flex-1 items-stretch", flip && "flex-row-reverse")}>
      <div className="hidden w-24 shrink-0 overflow-hidden bg-ink md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team && <img src={team.image} alt="" className="size-full object-cover" />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col justify-center bg-slate/60 px-2.5 py-3 sm:px-4", flip && "items-end text-right")}>
        {team ? (
          <Link href={`/teams/${team.id}`} className="block max-w-full truncate text-base font-black leading-tight hover:text-rose-hi sm:text-xl">
            {team.name}
          </Link>
        ) : (
          <span className="text-base font-black text-ash sm:text-xl">{name || t.common.tbd}</span>
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
  const w = when(match.datetime, lang === "bg" ? "bg-BG" : "en-GB");
  const played = match.winner !== null;
  return (
    <div className="flex items-stretch border border-line bg-coal">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center px-1 py-3 text-center sm:w-32">
        <span className="num text-sm uppercase text-paper/80">{w?.date ?? t.common.tbd}</span>
        <span className="num text-2xl leading-none sm:text-4xl">{w?.time ?? "--:--"}</span>
        <span className="text-[0.6rem] font-black text-rose-hi">{t.common.eet}</span>
      </div>
      <Side id={match.team1.id} name={match.team1.name} />
      <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 bg-ink py-3 sm:w-16">
        {played ? (
          <span className="num text-xl sm:text-2xl">
            <span className={cn(match.winner === 1 ? "text-paper" : "text-ash")}>{match.team1.score}</span>
            <span className="text-ash">-</span>
            <span className={cn(match.winner === 2 ? "text-paper" : "text-ash")}>{match.team2.score}</span>
          </span>
        ) : (
          <span className="heading-slam text-lg text-rose-hi sm:text-2xl">{t.common.vs}</span>
        )}
      </div>
      <Side id={match.team2.id} name={match.team2.name} flip />
      {match.link && (
        <a
          href={match.link}
          target="_blank"
          rel="noreferrer"
          aria-label={t.common.matchLink}
          className="hidden w-14 shrink-0 items-center justify-center text-ash transition hover:text-paper sm:flex"
        >
          <Link2 className="size-5" />
        </a>
      )}
    </div>
  );
}
