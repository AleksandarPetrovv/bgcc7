"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { type Match, fmtNum, teamHref } from "@/lib/data";
import { useTournament } from "./tournament";
import { useDict, useLang } from "./lang";
import { DetailsChip, MatchDialog } from "./match-dialog";
import { cn } from "@/lib/utils";
import { MeTag, meT } from "./me";
import { LiveTag } from "./live-tag";
import { useResultsEye } from "./overlay-context";
import { fmtSofia } from "@/lib/time";
import { FitLabel } from "./fit-label";
import { hasResults } from "@/lib/matches";
import { localeOf } from "@/lib/i18n/locale";
import { RuleDiamond } from "@/components/site/rule";
import { OUT_TAG, type Walkover } from "@/lib/out";

const d = (s: string) => ({ "--d": s }) as React.CSSProperties;

/** the site's error red: the name of a team that is out, and (muted) the tag that stands in for a score */
export const OUT_TEXT = "text-rose-hi";

function Side({ id, flip, lost, small, at }: { id: string; flip?: boolean; lost?: boolean; small?: boolean; at: (s: number) => React.CSSProperties }) {
  const t = useDict();
  const { teamById } = useTournament();
  const team = teamById(id);
  return (
    <div
      {...meT(team?.id)}
      className={cn(
        "relative flex min-w-0 flex-col items-center px-1.5 text-center sm:px-4",
        small ? cn("row-span-full justify-center gap-1.5 py-2", flip ? "col-start-3" : "col-start-1") : "justify-start gap-2.5 py-5 sm:py-6",
        flip ? "in-right-far" : "in-left-far",
      )}
      style={at(0.1)}
    >
      {team ? (
        <>
          {!small && (
            <span className="-mb-1 hidden h-4 items-end justify-center sm:flex">
              <MeTag t={team.id} className="me-tag-plain text-[0.65rem]" />
            </span>
          )}
          <Link href={teamHref(team)} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.image} alt="" className={cn("in-pop rounded-full object-cover", small ? "size-10" : "size-14 sm:size-20", lost && "opacity-50")} style={at(0.25)} />
          </Link>
          <span className="flex max-w-full min-w-0 flex-col items-center gap-1.5">
            <Link href={teamHref(team)} className={cn("min-w-0 max-w-full font-display font-black leading-tight hover:text-rose-hi", small ? "truncate text-xs" : "line-clamp-2 break-words text-[0.8rem] sm:line-clamp-1 sm:text-lg", team.out ? OUT_TEXT : lost && "text-ash")}>
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
          <span className={cn("rounded-full bg-slate", small ? "size-10" : "size-14 sm:size-20")} />
          <span className={cn("font-display font-bold text-ash", small ? "text-xs" : "text-sm")}>{t.common.tbd}</span>
        </>
      )}
    </div>
  );
}

// small: the home page size; the round name gets the top line, the date sits under the score unless the results eye is there
/** "5 – 0": the winner's number bright, the rest grey; no winner (live) keeps both bright. The side that gave the match up shows its tag (FF / DQ / Out) instead of a number */
export function Scoreline({ score, winner, walkover, className }: { score: readonly [number | null, number | null]; winner?: number | null; walkover?: Walkover | null; className?: string }) {
  const tone = (n: 1 | 2) => (winner == null || winner === n ? "text-paper" : "text-ash");
  const part = (n: 1 | 2) => {
    if (walkover?.side === n) return <span className={cn(OUT_TEXT, "opacity-80")}>{OUT_TAG[walkover.kind]}</span>;
    const v = score[n - 1] ?? (walkover ? null : 0);
    return v === null ? null : <span className={tone(n)}>{v}</span>;
  };
  const [a, b] = [part(1), part(2)];
  return (
    <span className={cn("num whitespace-nowrap italic leading-none", className)}>
      {a}
      {a && b && <span className="mx-2 text-ash">–</span>}
      {b}
    </span>
  );
}

export function MatchRow({ match, live, small, label, delay = 0 }: { match: Match; live?: [number, number] | null; small?: boolean; label?: string[]; delay?: number }) {
  const t = useDict();
  const lang = useLang();
  const at = (s: number) => d(`${s + delay}s`);
  const w = match.datetime ? fmtSofia(new Date(match.datetime), localeOf(lang)) : null;
  const played = match.winner !== null;
  // a walkover with no opponent yet has no winner, but its giving-up side already shows its tag
  const lost = (n: 1 | 2) => (played ? match.winner !== n : match.walkover?.side === n);
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  const eye = useResultsEye() && match.links.length > 0 && hasResults(match);
  const when = w ? w : small || (match.team1.id && match.team2.id) ? t.common.tbd : "—";
  const dateCls = "num flex h-5 max-w-full items-center gap-2 whitespace-nowrap px-2 text-[0.7rem] italic leading-none text-paper/70 sm:text-[0.8rem]";
  const dateLine = (
    <div className={cn("in-drop", dateCls)} style={at(small ? 0.5 : 0.05)}>
      {label && <FitLabel labels={label} className="font-display text-xs font-bold text-rose-hi" />}
      {!small && when}
    </div>
  );
  const card = (
    <div
      className={cn(
        "group/row relative isolate grid",
        small ? "border-b" : "overflow-hidden border bg-coal",
        small
          ? "grid-cols-[minmax(0,1fr)_var(--mid)_minmax(0,1fr)] grid-rows-[1fr_auto_auto_1fr] [--mid:6.5rem] sm:[--mid:11rem]"
          : "grid-cols-[minmax(0,1fr)_6.5rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)]",
        live !== undefined ? "border-rose/70" : cn("border-line", small && "transition-colors hover:border-rose/60"),
      )}
    >
      {small ? (
        <RuleDiamond />
      ) : (
      <div className="pointer-events-none absolute inset-0 -z-10 flex" aria-hidden>
        {teams.map((team, i) => (
          <div key={i} className="relative w-1/2 overflow-hidden">
            {team && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.image}
                alt=""
                className={cn(
                  "absolute -inset-[5%] h-[110%] w-[110%] max-w-none object-cover blur-[1px]",
                  i ? "[mask-image:linear-gradient(to_left,black_10%,transparent_85%)]" : "[mask-image:linear-gradient(to_right,black_10%,transparent_85%)]",
                  "mix-blend-multiply contrast-125 dark:mix-blend-normal dark:contrast-100",
                  played && match.winner === i + 1 ? "opacity-35 grayscale-[30%] dark:opacity-20 dark:grayscale-[40%]" : "opacity-25 grayscale dark:opacity-10",
                )}
              />
            )}
          </div>
        ))}
      </div>
      )}
      <Side id={match.team1.id} lost={lost(1)} small={small} at={at} />
      {small && <div className="col-span-full row-start-2 flex min-w-0 justify-center pt-2" style={{ paddingInline: "calc((100% - var(--mid)) / 4 + 2rem)" }}>{dateLine}</div>}
      <div className={cn(small && "col-start-2 row-start-3")}>
        <div className={cn("flex h-full flex-col items-center justify-center", small ? "gap-1 pb-2 pt-1" : "gap-3 py-3")}>
          {!small && dateLine}
          <div className="in-slam flex flex-col items-center gap-1" style={at(0.4)}>
            {live !== undefined ? (
              <>
                <LiveTag />
                {live && <Scoreline score={live} className={small ? "text-3xl" : "text-[2.6rem] sm:text-5xl"} />}
              </>
            ) : played || match.walkover ? (
              <Scoreline score={[match.team1.score, match.team2.score]} winner={match.winner} walkover={match.walkover} className={small ? "text-3xl" : "text-[2.6rem] sm:text-5xl"} />
            ) : (
              <span className={cn("heading-slam leading-none text-paper", small ? "text-2xl" : "text-3xl sm:text-4xl")}>{t.common.vs}</span>
            )}
          </div>
          {eye && small ? (
            <MatchDialog match={match} className="group flex h-7 items-center justify-center">
              <span className="in-pop flex size-7 items-center justify-center text-rose transition-colors duration-200 group-hover:text-rose-hi" style={at(0.6)}>
                <Eye className="size-[1.3rem]" strokeWidth={2.25} aria-hidden />
              </span>
            </MatchDialog>
          ) : eye ? (
            <MatchDialog match={match} className="group flex h-5 items-center justify-center">
              <span className="in-pop flex" style={at(0.6)}>
                <DetailsChip />
              </span>
            </MatchDialog>
          ) : small ? (
            <span className={cn("in-drop", dateCls)} style={at(0.55)}>{when}</span>
          ) : (
            <span className="h-5" aria-hidden />
          )}
        </div>
      </div>
      <Side id={match.team2.id} flip lost={lost(2)} small={small} at={at} />
    </div>
  );
  return card;
}
