"use client";

import { ListOrdered } from "lucide-react";
import type { Match } from "@/lib/data";
import { roundName } from "@/lib/i18n/dict";
import { fmtSofia } from "@/lib/time";
import { MatchDialog } from "./match-dialog";
import { useDict, useLang } from "./lang";
import { useTournament } from "./tournament";
import { cn } from "@/lib/utils";

function Row({ m, slot }: { m: Match; slot: 1 | 2 }) {
  const { teamById } = useTournament();
  const side = slot === 1 ? m.team1 : m.team2;
  const team = teamById(side.id);
  const won = m.winner === slot;
  const lost = m.winner !== null && !won;
  return (
    <span className={cn("relative flex items-center gap-3 px-4 py-2.5", won && "bg-balkan/12", lost && "opacity-45")}>
      {won && <span className="absolute inset-y-1.5 left-0 w-0.5 bg-balkan" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {team && <img src={team.image} alt="" className="size-9 shrink-0 object-cover" />}
      <span className={cn("min-w-0 flex-1 truncate text-[0.95rem] font-bold", won && "font-black text-balkan")}>{team?.name ?? side.name}</span>
      <span className={cn("num w-7 shrink-0 text-right text-2xl leading-none", won ? "text-balkan" : "text-paper/80")}>{side.score ?? 0}</span>
    </span>
  );
}

export function ResultCard({ m }: { m: Match }) {
  const t = useDict();
  const lang = useLang();
  const body = (
    <>
      <span className="flex items-center gap-2 border-b border-line bg-ink/70 px-4 py-2 text-xs font-black uppercase">
        <span className="truncate text-rose-hi">{roundName(t, m.round)}</span>
        <span className="num ml-auto shrink-0 text-[0.8rem] font-normal normal-case text-paper/70">{m.datetime && fmtSofia(new Date(m.datetime), lang === "bg" ? "bg-BG" : "en-GB")}</span>
        {m.links.length > 0 && (
          <span className="flex size-6 shrink-0 -skew-x-12 items-center justify-center border border-line text-ash transition-colors group-hover:border-rose group-hover:bg-rose/15 group-hover:text-paper">
            <ListOrdered className="size-3.5 skew-x-12" />
          </span>
        )}
      </span>
      <Row m={m} slot={1} />
      <span className="block h-px bg-line" />
      <Row m={m} slot={2} />
    </>
  );
  const cls = "lift group flex w-full flex-col overflow-hidden border border-line bg-coal text-left transition-colors hover:border-paper/30";
  return m.links.length > 0 ? (
    <MatchDialog match={m} className={cls}>
      {body}
    </MatchDialog>
  ) : (
    <div className={cls}>{body}</div>
  );
}
