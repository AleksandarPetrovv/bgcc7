"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
        small ? cn("row-span-full justify-center gap-1.5 py-2", flip ? "col-start-3" : "col-start-1") : "justify-start gap-2.5 py-5 sm:py-6",
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
            <img src={team.image} alt="" className={cn("in-pop object-cover", small ? "size-10 rounded-full" : "size-14 border border-dashed border-paper/25 sm:size-20", lost && "opacity-50")} style={at(0.25)} />
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
          <span className={cn("bg-slate", small ? "size-10 rounded-full" : "size-14 border border-dashed border-paper/25 sm:size-20")} />
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

// small: the home page size; the round name gets the top line (label = longest to shortest), the date sits under the score unless the results eye is there; delay shifts the whole intro
// plain: no results eye, the date always shows (stream overlay)
export function MatchRow({ match, live, small, label, delay = 0, plain }: { match: Match; live?: [number, number] | null; small?: boolean; label?: string[]; delay?: number; plain?: boolean }) {
  const lbl = useRef<HTMLSpanElement>(null);
  const [level, setLevel] = useState(0);
  const [fonts, recheck] = useState(0);
  // steps to the next shorter label while it overflows; shortcut: rechecked once fonts load, not on resize
  useLayoutEffect(() => {
    const el = lbl.current;
    if (!el || !label || level >= label.length - 1) return;
    // text width vs the span's content box: scrollWidth rounds and misses sub-pixel overflow that still shows an ellipsis
    const r = document.createRange();
    r.selectNodeContents(el);
    if (r.getBoundingClientRect().width > el.getBoundingClientRect().width - parseFloat(getComputedStyle(el).paddingRight) + 0.5) setLevel(level + 1);
  }, [label, level, fonts]);
  useEffect(() => {
    const f = document.fonts;
    if (!f) return;
    const bump = () => recheck((n) => n + 1);
    f.ready.then(bump);
    f.addEventListener("loadingdone", bump);
    return () => f.removeEventListener("loadingdone", bump);
  }, []);
  const t = useDict();
  const lang = useLang();
  const at = (s: number) => d(`${s + delay}s`);
  const w = match.datetime ? fmtSofia(new Date(match.datetime), lang === "bg" ? "bg-BG" : "en-GB") : null;
  const played = match.winner !== null;
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  const eye = !plain && match.links.length > 0 && hasResults(match);
  const when = w ? w : small || (match.team1.id && match.team2.id) ? t.common.tbd : "—";
  const dateCls = "num flex h-5 max-w-full items-center gap-2 whitespace-nowrap px-2 text-[0.7rem] italic leading-none text-paper/70 sm:text-[0.8rem]";
  const dateLine = (
    <div className={cn("in-drop", dateCls)} style={at(small ? 0.5 : 0.05)}>
      {label && (
        <span ref={lbl} className="min-w-0 truncate font-display text-xs font-bold text-rose-hi">
          {label[level]}
        </span>
      )}
      {!small && when}
    </div>
  );
  const card = (
    <div
      className={cn(
        // small: no box, only a dashed rule underneath with a diamond in the middle (like the timeline)
        "group/row relative isolate grid",
        small ? "border-b" : "overflow-hidden border bg-coal",
        // small: the label line spans the card (row 2) and stops 2rem short of the pictures, label + score stay centred together
        small
          ? "grid-cols-[minmax(0,1fr)_var(--mid)_minmax(0,1fr)] grid-rows-[1fr_auto_auto_1fr] [--mid:6.5rem] sm:[--mid:11rem]"
          : "grid-cols-[minmax(0,1fr)_6.5rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_11rem_minmax(0,1fr)]",
        live !== undefined ? "border-rose/70" : cn("border-line", small && "transition-colors hover:border-rose/60"),
      )}
    >
      {small ? (
        <span className="pointer-events-none absolute -bottom-[7px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-rose" aria-hidden />
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
                  "size-full scale-110 object-cover blur-[1px] transition-transform duration-700 ease-out group-hover/row:scale-125 motion-reduce:transition-none",
                  i ? "[mask-image:linear-gradient(to_left,black_10%,transparent_85%)]" : "[mask-image:linear-gradient(to_right,black_10%,transparent_85%)]",
                  // light: multiplied in so the picture darkens the card like ink instead of washing it out
                  "mix-blend-multiply contrast-125 dark:mix-blend-normal dark:contrast-100",
                  played && match.winner === i + 1 ? "opacity-35 grayscale-[30%] dark:opacity-20 dark:grayscale-[40%]" : "opacity-25 grayscale dark:opacity-10",
                )}
              />
            )}
          </div>
        ))}
      </div>
      )}
      <Side id={match.team1.id} lost={played && match.winner !== 1} small={small} at={at} />
      {small && <div className="col-span-full row-start-2 flex min-w-0 justify-center pt-2" style={{ paddingInline: "calc((100% - var(--mid)) / 4 + 2rem)" }}>{dateLine}</div>}
      <div className={cn(small && "col-start-2 row-start-3")}>
        <div className={cn("flex h-full flex-col items-center justify-center", small ? "gap-1 pb-2 pt-1" : "gap-3 py-3")}>
          {!small && dateLine}
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
          {eye && small ? (
            // bare pink eye, grows on hover
            <MatchDialog match={match} className="group flex h-6 items-center justify-center">
              <span className="flex size-6 items-center justify-center text-rose transition-[color,scale] duration-200 group-hover:scale-125 group-hover:text-rose-hi">
                <Eye className="size-[18px]" strokeWidth={2.25} aria-hidden />
              </span>
            </MatchDialog>
          ) : eye ? (
            <MatchDialog match={match} className="group flex h-5 items-center justify-center">
              <DetailsChip />
            </MatchDialog>
          ) : small ? (
            <span className={cn("in-drop", dateCls)} style={at(0.55)}>{when}</span>
          ) : (
            <span className="h-5" aria-hidden />
          )}
        </div>
      </div>
      <Side id={match.team2.id} flip lost={played && match.winner !== 2} small={small} at={at} />
    </div>
  );
  return card;
}
