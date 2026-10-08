"use client";

import Link from "next/link";
import { type Match, fmtNum, teamHref } from "@/lib/data";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { MatchDialog } from "./match-dialog";
import { cn } from "@/lib/utils";
import { MeTag, meT } from "./me";
import { TZ } from "@/lib/time";

function when(dt: string | null, locale: string) {
  if (!dt) return null;
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString(locale, { timeZone: TZ, day: "2-digit", month: "short", weekday: "short" }),
    time: d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

function Side({ id, flip }: { id: string; flip?: boolean }) {
  const t = useDict();
  const { teamById } = useTournament();
  const team = teamById(id);
  if (!team) return <div className="min-w-0 flex-1" />;
  return (
    <div className={cn("flex min-w-0 flex-1 items-stretch", flip ? "in-right-far flex-row-reverse" : "in-left-far")} style={{ "--d": "0.1s" } as React.CSSProperties}>
      <div className="relative hidden w-24 shrink-0 overflow-hidden bg-ink md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.image} alt="" className={cn("absolute inset-0 size-full object-cover", flip ? "in-wipe-r" : "in-wipe")} style={{ "--d": "0.3s" } as React.CSSProperties} />
      </div>
      <div {...meT(team.id)} className={cn("relative flex min-w-0 flex-1 flex-col justify-center bg-slate/60 px-2.5 py-3 sm:px-4", flip && "items-end text-right")}>
        <span className={cn("flex max-w-full min-w-0 items-center", flip && "flex-row-reverse")}>
          <Link href={teamHref(team)} className={cn("block min-w-0 truncate text-base font-black leading-tight hover:text-rose-hi sm:text-xl", flip ? "in-wipe-r" : "in-wipe")} style={{ "--d": "0.35s" } as React.CSSProperties}>
            {team.name}
          </Link>
          <MeTag t={team.id} />
        </span>
        <div className="in-up mt-1 hidden gap-4 text-[0.65rem] font-bold uppercase text-ash sm:flex" style={{ "--d": "0.5s" } as React.CSSProperties}>
          <span>
            {t.common.seed} <span className="num text-base text-paper">{team.seed}</span>
          </span>
          <span>
            {t.common.avgRank} <span className="num text-base text-paper">#{fmtNum(team.avgRank)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function LiveTag({ className }: { className?: string }) {
  const t = useDict();
  return (
    <span className={cn("inline-flex items-center gap-1 bg-rose px-1.5 py-0.5 text-[0.6rem] font-black uppercase leading-none tracking-[0.14em] text-white", className)}>
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
      {t.home.live}
    </span>
  );
}

export function MatchRow({ match, live }: { match: Match; live?: [number, number] | null }) {
  const t = useDict();
  const lang = useLang();
  const { teamById } = useTournament();
  const w = when(match.datetime, lang === "bg" ? "bg-BG" : "en-GB");
  const played = match.winner !== null;
  const a = teamById(match.team1.id);
  const b = teamById(match.team2.id);
  const box = cn("relative flex h-24 items-stretch overflow-hidden border bg-coal", live !== undefined ? "border-rose/70" : "border-line");
  const time = (
    <div className="in-drop flex w-20 shrink-0 flex-col items-center justify-center px-1 py-3 text-center sm:w-32" style={{ "--d": "0.05s" } as React.CSSProperties}>
      <span className="num text-sm uppercase text-paper/80">{w?.date ?? t.common.tbd}</span>
      <span className="in-pop num text-2xl leading-none sm:text-4xl" style={{ "--d": "0.2s" } as React.CSSProperties}>{w?.time ?? "--:--"}</span>
      <span className="text-[0.6rem] font-black text-rose-hi">{t.common.eet}</span>
    </div>
  );
  const center = (
      <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 bg-ink py-3 sm:w-20">
        <div className="in-slam flex flex-col items-center gap-1" style={{ "--d": "0.4s" } as React.CSSProperties}>
        {live !== undefined ? (
          <>
            <LiveTag />
            {live && (
              <span className="num text-xl text-paper sm:text-2xl">
                {live[0]}
                <span className="text-ash">-</span>
                {live[1]}
              </span>
            )}
          </>
        ) : played ? (
          <span className="num text-xl sm:text-2xl">
            <span className={cn(match.winner === 1 ? "text-paper" : "text-ash")}>{match.team1.score ?? 0}</span>
            <span className="text-ash">-</span>
            <span className={cn(match.winner === 2 ? "text-paper" : "text-ash")}>{match.team2.score ?? 0}</span>
          </span>
        ) : (
          <span className="heading-slam text-lg text-rose-hi sm:text-2xl">{t.common.vs}</span>
        )}
        </div>
      </div>
  );
  if (a && b)
    return (
      <div className={box}>
        {time}
        <Side id={a.id} />
        {center}
        <Side id={b.id} flip />
        {match.links.length > 0 ? <MatchDialog match={match} /> : <span className="hidden w-14 shrink-0 sm:block" aria-hidden />}
      </div>
    );
  const only = a ?? b;
  if (!only)
    return (
      <div className={cn(box, "w-fit")}>
        {time}
        {center}
      </div>
    );
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)_3.5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)_5rem_minmax(0,1fr)_3.5rem]">
      <div className={cn(box, "col-span-3")}>
        {time}
        <Side id={only.id} />
        {center}
      </div>
    </div>
  );
}
