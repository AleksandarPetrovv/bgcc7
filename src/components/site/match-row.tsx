"use client";

import Link from "next/link";
import { type Match, fmtNum, teamHref } from "@/lib/data";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { DetailsChip, MatchDialog } from "./match-dialog";
import { cn } from "@/lib/utils";
import { MeTag, meT } from "./me";
import { TZ } from "@/lib/time";

const d = (s: string) => ({ "--d": s }) as React.CSSProperties;

function when(dt: string | null, locale: string) {
  if (!dt) return null;
  const x = new Date(dt);
  return {
    day: x.toLocaleDateString(locale, { timeZone: TZ, weekday: "short" }),
    date: x.toLocaleDateString(locale, { timeZone: TZ, day: "numeric", month: "short" }),
    time: x.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

function Side({ id, flip, lost }: { id: string; flip?: boolean; lost?: boolean }) {
  const t = useDict();
  const { teamById } = useTournament();
  const team = teamById(id);
  return (
    <div
      {...meT(team?.id)}
      className={cn(
        "relative flex min-w-0 flex-col items-center justify-start gap-2.5 px-2 py-5 text-center sm:px-4 sm:py-6",
        flip ? "in-right-far" : "in-left-far",
      )}
      style={d("0.1s")}
    >
      {team ? (
        <>
          <Link href={teamHref(team)} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.image} alt="" className={cn("in-pop size-14 border-b-[3px] object-cover sm:size-20", flip ? "border-azure" : "border-crimson", lost && "opacity-50")} style={d("0.25s")} />
          </Link>
          <span className="flex max-w-full min-w-0 flex-col items-center gap-1.5">
            <Link href={teamHref(team)} className={cn("line-clamp-2 min-w-0 max-w-full break-words text-sm font-display font-black leading-tight hover:text-rose-hi sm:text-lg", lost && "text-ash")}>
              {team.name}
            </Link>
            <MeTag t={team.id} className="text-[0.55rem] sm:text-[0.65rem]" />
          </span>
          <span className="in-up hidden gap-3 text-[0.6rem] font-display font-bold text-ash sm:flex" style={d("0.5s")}>
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
          <span className="size-14 border-b-[3px] border-line bg-slate sm:size-20" />
          <span className="text-sm font-display font-bold text-ash">{t.common.tbd}</span>
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

export function MatchRow({ match, live }: { match: Match; live?: [number, number] | null }) {
  const t = useDict();
  const lang = useLang();
  const w = when(match.datetime, lang === "bg" ? "bg-BG" : "en-GB");
  const played = match.winner !== null;
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  return (
    <div
      className={cn(
        "group/row relative isolate grid grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)] overflow-hidden border bg-coal sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)]",
        live !== undefined ? "border-rose/70" : "border-line",
      )}
    >
      <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-linear-to-r from-transparent via-white/45 to-transparent transition-transform duration-1000 ease-out group-hover/row:translate-x-[650%] motion-reduce:hidden" aria-hidden />
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
      <Side id={match.team1.id} lost={played && match.winner !== 1} />
      <div>
        <div className="flex h-full flex-col items-center justify-center gap-3 py-3">
          <div className="in-drop num flex h-5 items-center gap-2 whitespace-nowrap text-[0.7rem] uppercase leading-none text-ash sm:text-sm" style={d("0.05s")}>
            {w ? (
              <>
                <span className="hidden sm:inline">{w.day}</span>
                <span>{w.date}</span> <span className="text-paper/90">{w.time}</span>
              </>
            ) : match.team1.id && match.team2.id ? (
              t.common.tbd
            ) : (
              "—"
            )}
          </div>
          <div className="in-slam flex flex-col items-center gap-1" style={d("0.4s")}>
            {live !== undefined ? (
              <>
                <LiveTag />
                {live && (
                  <span className="num text-[2.6rem] leading-none text-paper sm:text-5xl">
                    {live[0]}
                    <span className="text-ash">-</span>
                    {live[1]}
                  </span>
                )}
              </>
            ) : played ? (
              <span className="num text-[2.6rem] leading-none sm:text-5xl">
                <span className={match.winner === 1 ? "text-paper" : "text-ash"}>{match.team1.score ?? 0}</span>
                <span className="text-ash">-</span>
                <span className={match.winner === 2 ? "text-paper" : "text-ash"}>{match.team2.score ?? 0}</span>
              </span>
            ) : (
              <span className="heading-slam text-3xl leading-none text-paper sm:text-4xl">{t.common.vs}</span>
            )}
          </div>
          {match.links.length > 0 ? (
            <MatchDialog match={match} className="group flex h-5 items-center justify-center">
              <DetailsChip />
            </MatchDialog>
          ) : (
            <span className="h-5" aria-hidden />
          )}
        </div>
      </div>
      <Side id={match.team2.id} flip lost={played && match.winner !== 2} />
    </div>
  );
}
