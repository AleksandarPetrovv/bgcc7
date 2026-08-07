"use client";

import { Fragment, useState } from "react";
import { ExternalLink, ListOrdered } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDict } from "./lang";
import { MODS, teamById, fmtNum, type Match } from "@/lib/data";
import { roundName } from "@/lib/i18n/dict";
import type { MapResult, PlayerLine, Scoreboard } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function Side({ players, won, lost, total, flip }: { players: PlayerLine[]; won: boolean; lost: boolean; total: number; flip?: boolean }) {
  const t = useDict();
  return (
    <div className={cn("min-w-0 border-line p-3", flip ? "sm:border-l" : "", won ? "bg-slate/60" : "", lost && "opacity-55")}>
      <ul className="space-y-1.5">
        {players.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.avatar} alt="" className="size-6 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
            {p.mods.length > 0 && <span className="text-[0.65rem] font-black uppercase text-ash">{p.mods.join("")}</span>}
            <span className="num w-14 text-right text-ash">{pct(p.acc)}</span>
            <span className="num w-20 text-right text-base">{fmtNum(p.score)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
        <span className="text-[0.65rem] font-black uppercase tracking-widest text-ash">{t.match.total}</span>
        <span className={cn("num text-xl", won ? "text-paper" : "text-ash")}>{fmtNum(total)}</span>
      </div>
    </div>
  );
}

function MapCard({ m }: { m: MapResult }) {
  const t = useDict();
  const color = m.mod ? MODS[m.mod]?.color : undefined;
  return (
    <div className={cn("border border-line bg-coal", m.note && "opacity-50")}>
      <div className="relative flex min-h-16 items-center gap-3 overflow-hidden px-3 py-2">
        {m.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.cover} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
        )}
        <span className="relative heading-slam shrink-0 border-l-[3px] bg-ink/80 px-2 py-1 text-lg" style={{ borderColor: color ?? "var(--color-line)" }}>
          {m.slot ?? "—"}
        </span>
        <div className="relative min-w-0 flex-1">
          <div className="truncate text-sm font-black">
            {m.artist && <span className="text-paper/70">{m.artist} - </span>}
            {m.title}
          </div>
          <div className="truncate text-xs text-ash">
            [{m.version}]{m.mods.length > 0 && <span className="ml-2 font-black uppercase">+{m.mods.join("")}</span>}
            {m.note && <span className="ml-2 font-black uppercase text-rose-hi">{t.match.notes[m.note]}</span>}
          </div>
        </div>
        {!m.note && (
          <span className="num relative shrink-0 text-2xl">
            <span className={m.winner === 1 ? "text-paper" : "text-ash"}>{m.running[0]}</span>
            <span className="text-ash">-</span>
            <span className={m.winner === 2 ? "text-paper" : "text-ash"}>{m.running[1]}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 border-t border-line sm:grid-cols-2">
        <Side players={m.players[0]} total={m.team1} won={m.winner === 1} lost={m.winner === 2} />
        <Side players={m.players[1]} total={m.team2} won={m.winner === 2} lost={m.winner === 1} flip />
      </div>
    </div>
  );
}

function Board({ match, data }: { match: Match; data: Scoreboard }) {
  const t = useDict();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  return (
    <div className="space-y-3 p-4 sm:p-6">
      {data.maps.map((m, i) => (
        <div key={`${m.lobby}-${i}`}>
          {data.lobbies.length > 1 && (i === 0 || data.maps[i - 1].lobby !== m.lobby) && (
            <div className="mb-3 mt-2 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-ash">
              {t.match.lobby(m.lobby + 1)}
              <span className="h-px flex-1 border-t border-dashed border-line" />
            </div>
          )}
          <MapCard m={m} />
        </div>
      ))}

      {data.totals.length > 0 && (
        <div className="pt-4">
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-ash">{t.match.players}</div>
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-[0.65rem] font-black uppercase tracking-widest text-ash">
                  <th className="px-3 py-2 text-left">{t.match.players}</th>
                  <th className="px-3 py-2 text-right">{t.match.mapsPlayed}</th>
                  <th className="px-3 py-2 text-right">{t.match.avgAcc}</th>
                  <th className="px-3 py-2 text-right">{t.match.total}</th>
                </tr>
              </thead>
              <tbody>
                {([1, 2] as const).map((k) => {
                  const rows = data.totals.filter((p) => p.team === k);
                  if (!rows.length) return null;
                  const edge = k === 1 ? "border-l-rose" : "border-l-balkan";
                  return (
                    <Fragment key={k}>
                      <tr className={cn("border-b border-l-[3px] border-line bg-slate/60", edge)}>
                        <td colSpan={4} className={cn("px-3 py-1.5 text-xs font-black uppercase tracking-wide", k === 1 ? "text-rose-hi" : "text-balkan")}>
                          {teams[k - 1]?.name ?? (k === 1 ? match.team1.name : match.team2.name)}
                        </td>
                      </tr>
                      {rows.map((p) => (
                        <tr key={p.id} className={cn("border-b border-l-[3px] border-line last:border-b-0", edge)}>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.avatar} alt="" className="size-6" />
                              <span className="font-bold">{p.name}</span>
                            </span>
                          </td>
                          <td className="num px-3 py-2 text-right text-ash">{p.maps}</td>
                          <td className="num px-3 py-2 text-right text-ash">{pct(p.acc)}</td>
                          <td className="num px-3 py-2 text-right text-base">{fmtNum(p.score)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function MatchDialog({ match }: { match: Match }) {
  const t = useDict();
  const [data, setData] = useState<Scoreboard | "error" | null>(null);
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  const score = data && data !== "error" ? data.score : [match.team1.score ?? 0, match.team2.score ?? 0];

  const load = () => {
    if (data && data !== "error" && Math.max(...data.score) >= 7) return;
    if (data === "error") setData(null);
    fetch(`/api/matches/${match.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Scoreboard) => setData(d))
      .catch(() => setData("error"));
  };

  return (
    <Dialog onOpenChange={(open) => open && load()}>
      <DialogTrigger
        aria-label={t.match.details}
        title={t.match.details}
        className="flex w-10 shrink-0 items-center justify-center text-ash transition hover:bg-slate hover:text-paper sm:w-14"
      >
        <ListOrdered className="size-5" />
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-none border border-line bg-ink p-0 ring-0 sm:max-w-4xl">
        <div className="sticky top-0 z-10 border-b border-line bg-ink/95 px-4 py-4 backdrop-blur sm:px-6">
          <DialogTitle className="text-xs font-black uppercase tracking-widest text-rose-hi">
            {roundName(t, match.round)} · {t.match.details}
          </DialogTitle>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 pr-8">
            {teams.map((team, i) => (
              <div key={i} className={cn("flex min-w-0 items-center gap-3", i === 1 && "order-3 flex-row-reverse text-right")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {team && <img src={team.image} alt="" className="size-10 shrink-0 object-cover sm:size-12" />}
                <span className={cn("line-clamp-2 text-sm font-black leading-tight sm:text-lg", match.winner && match.winner !== i + 1 && "text-ash")}>{team?.name}</span>
              </div>
            ))}
            <span className="num order-2 text-3xl sm:text-4xl">
              <span className={match.winner === 2 ? "text-ash" : "text-paper"}>{score[0]}</span>
              <span className="text-ash"> - </span>
              <span className={match.winner === 1 ? "text-ash" : "text-paper"}>{score[1]}</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {match.links.map((id, i) => (
              <a
                key={id}
                href={`https://osu.ppy.sh/community/matches/${id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 border border-line px-2 py-1 text-[0.7rem] font-black uppercase text-ash transition hover:border-paper/40 hover:text-paper"
              >
                {match.links.length > 1 ? t.match.lobby(i + 1) : "osu! mp"} <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        </div>
        {data === null ? (
          <p className="p-10 text-center text-sm text-ash">{t.match.loading}</p>
        ) : data === "error" ? (
          <p className="p-10 text-center text-sm text-rose-hi">{t.match.error}</p>
        ) : (
          <Board match={match} data={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}
