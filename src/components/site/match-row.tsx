"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { type Match, fmtNum, teamHref } from "@/lib/data";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { DetailsChip, MatchDialog } from "./match-dialog";
import { cn } from "@/lib/utils";
import { MeTag, meT } from "./me";
import { fmtSofia } from "@/lib/time";
import { hasResults } from "@/lib/matches";

const d = (s: string) => ({ "--d": s }) as React.CSSProperties;

function Side({ id, flip, lost, small, at }: { id: string; flip?: boolean; lost?: boolean; small?: boolean; at: (s: number) => React.CSSProperties }) {
  const t = useDict();
  const { teamById } = useTournament();
  const team = teamById(id);
  return (
    <div
      {...meT(team?.id)}
      className={cn(
        "relative flex min-w-0 flex-col items-center px-1.5 text-center sm:px-4",
        small ? "justify-center gap-1.5 py-2" : "justify-start gap-2.5 py-5 sm:py-6",
        flip ? "in-right-far" : "in-left-far",
      )}
      style={at(0.1)}
    >
      {team ? (
        <>
          {/* on desktop the badge sits above the picture in a slot both sides keep, so nothing below it shifts */}
          {!small && (
            <span className="-mb-1 hidden h-4 items-end justify-center sm:flex">
              <MeTag t={team.id} className="me-tag-plain text-[0.65rem]" />
            </span>
          )}
          <Link href={teamHref(team)} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.image} alt="" className={cn("in-pop border border-dashed border-paper/25 object-cover", small ? "size-10" : "size-14 sm:size-20", lost && "opacity-50")} style={at(0.25)} />
          </Link>
          <span className="flex max-w-full min-w-0 flex-col items-center gap-1.5">
            <Link href={teamHref(team)} className={cn("min-w-0 max-w-full font-display font-black leading-tight hover:text-rose-hi", small ? "truncate text-xs" : "line-clamp-2 break-words text-[0.8rem] sm:line-clamp-1 sm:text-lg", lost && "text-ash")}>
              {team.name}
            </Link>
            {!small && (
              <span className="sm:hidden">
                <MeTag t={team.id} className="me-tag-plain text-[0.55rem]" />
              </span>
            )}
          </span>
          <span className={cn("in-up hidden gap-3 text-[0.6rem] font-display font-bold text-ash", !small && "sm:flex")} style={at(0.5)}>
            <span>
              {t.common.seed} <span className="num text-sm text-paper">{team.seed}</span>
            </span>
            <span>
              {t.common.avgRank} <span className="num text-sm text-paper">#{fmtNum(team.avgRank)}</span>
            </span>
          </span>
        </>
      ) : (
        <>
          {!small && <span className="-mb-1 hidden h-4 sm:block" />}
          <span className={cn("border border-dashed border-paper/25 bg-slate", small ? "size-10" : "size-14 sm:size-20")} />
          <span className={cn("font-display font-bold text-ash", small ? "text-xs" : "text-sm")}>{t.common.tbd}</span>
        </>
      )}
    </div>
  );
}

export function LiveTag({ className }: { className?: string }) {
  const t = useDict();
  return (
    <span className={cn("inline-flex items-center gap-1 bg-rose px-1.5 py-0.5 text-[0.6rem] font-display font-bold leading-none text-white", className)}>
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
      {t.home.live}
    </span>
  );
}

// small: the home page size, with the round name next to the date (label = [full, short]); delay shifts the whole intro
export function MatchRow({ match, live, small, label, delay = 0 }: { match: Match; live?: [number, number] | null; small?: boolean; label?: [string, string]; delay?: number }) {
  const lbl = useRef<HTMLSpanElement>(null);
  const [short, setShort] = useState(false);
  // shortcut: measured on mount and once fonts load, not on resize (the middle column has a fixed width)
  useLayoutEffect(() => {
    const fit = () => {
      const el = lbl.current;
      if (el && el.scrollWidth > el.clientWidth + 1) setShort(true);
    };
    fit();
    document.fonts?.ready.then(fit);
  }, []);
  const t = useDict();
  const lang = useLang();
  const at = (s: number) => d(`${s + delay}s`);
  const w = match.datetime ? fmtSofia(new Date(match.datetime), lang === "bg" ? "bg-BG" : "en-GB") : null;
  const played = match.winner !== null;
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  return (
    <div
      className={cn(
        "group/row relative isolate grid grid-cols-[minmax(0,1fr)_6.5rem_minmax(0,1fr)] overflow-hidden border bg-coal",
        small ? "sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)]" : "sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)]",
        live !== undefined ? "border-rose/70" : "border-line",
      )}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 flex" aria-hidden>
        {teams.map((team, i) => (
          <div key={i} className="relative w-1/2 overflow-hidden">
            {team && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.image}
                alt=""
                className={cn(
                  "size-full scale-110 object-cover blur-[1px] transition-transform duration-700 ease-out group-hover/row:scale-125 motion-reduce:transition-none",
                  i ? "[mask-image:linear-gradient(to_left,black_10%,transparent_85%)]" : "[mask-image:linear-gradient(to_right,black_10%,transparent_85%)]",
                  played && match.winner === i + 1 ? "opacity-20 grayscale-[40%]" : "opacity-10 grayscale",
                )}
              />
            )}
          </div>
        ))}
      </div>
      <Side id={match.team1.id} lost={played && match.winner !== 1} small={small} at={at} />
      <div>
        <div className={cn("flex h-full flex-col items-center justify-center", small ? "gap-1 py-2" : "gap-3 py-3")}>
          <div className="in-drop num flex h-5 items-center gap-2 whitespace-nowrap px-2 text-[0.7rem] italic leading-none text-paper/70 sm:text-[0.8rem]" style={at(0.05)}>
            {label && (
              <span ref={lbl} className="min-w-0 truncate font-display text-xs font-bold text-rose-hi">
                {short ? label[1] : label[0]}
              </span>
            )}
            {w ? (
              w
            ) : small || (match.team1.id && match.team2.id) ? (
              t.common.tbd
            ) : (
              "—"
            )}
          </div>
          <div className="in-slam flex flex-col items-center gap-1" style={at(0.4)}>
            {live !== undefined ? (
              <>
                <LiveTag />
                {live && (
                  <span className={cn("num italic leading-none text-paper", small ? "text-3xl" : "text-[2.6rem] sm:text-5xl")}>
                    {live[0]}
                    <span className="mx-2 text-ash">–</span>
                    {live[1]}
                  </span>
                )}
              </>
            ) : played ? (
              <span className={cn("num italic leading-none", small ? "text-3xl" : "text-[2.6rem] sm:text-5xl")}>
                <span className={match.winner === 1 ? "text-paper" : "text-ash"}>{match.team1.score ?? 0}</span>
                <span className="mx-2 text-ash">–</span>
                <span className={match.winner === 2 ? "text-paper" : "text-ash"}>{match.team2.score ?? 0}</span>
              </span>
            ) : (
              <span className={cn("heading-slam leading-none text-paper", small ? "text-2xl" : "text-3xl sm:text-4xl")}>{t.common.vs}</span>
            )}
          </div>
          {match.links.length > 0 && hasResults(match) ? (
            <MatchDialog match={match} className="group flex h-5 items-center justify-center">
              <DetailsChip />
            </MatchDialog>
          ) : (
            <span className="h-5" aria-hidden />
          )}
        </div>
      </div>
      <Side id={match.team2.id} flip lost={played && match.winner !== 2} small={small} at={at} />
    </div>
  );
}
