"use client";

import { useState } from "react";
import { ExternalLink, ListOrdered } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDict } from "./lang";
import { MODS, fmtNum, type Match } from "@/lib/data";
import { useTournament } from "./tournament";
import { roundName } from "@/lib/i18n/dict";
import { matchSlug } from "@/lib/matches";
import type { MapResult, PlayerLine, Scoreboard } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const cache = new Map<string, Scoreboard>();
const TEAM = ["border-rose", "border-azure"];
const TEAM_TEXT = ["text-rose-hi", "text-azure-hi"];

type Cost = { id: number; name: string; avatar: string; team: 1 | 2; maps: number; score: number; acc: number; cost: number };

function matchCosts(data: Scoreboard): Cost[] {
  const maps = data.maps.filter((m) => !m.note);
  const acc = new Map<number, Cost & { ratio: number; accSum: number }>();
  for (const m of maps) {
    const all = [...m.players[0], ...m.players[1]].map((p) => p.score).filter((s) => s > 0).sort((a, b) => a - b);
    if (!all.length) continue;
    const mid = all.length % 2 ? all[(all.length - 1) / 2] : (all[all.length / 2 - 1] + all[all.length / 2]) / 2;
    m.players.forEach((side, k) =>
      side.forEach((p) => {
        const c = acc.get(p.id) ?? { id: p.id, name: p.name, avatar: p.avatar, team: (k + 1) as 1 | 2, maps: 0, score: 0, acc: 0, cost: 0, ratio: 0, accSum: 0 };
        c.maps++;
        c.score += p.score;
        c.accSum += p.acc;
        c.ratio += mid ? p.score / mid : 0;
        acc.set(p.id, c);
      }),
    );
  }
  const rows = [...acc.values()].filter((c) => c.score > 0);
  const avgMaps = rows.reduce((n, c) => n + c.maps, 0) / (rows.length || 1);
  return rows
    .map(({ ratio, accSum, ...c }) => ({ ...c, acc: accSum / c.maps, cost: (ratio / c.maps) * Math.cbrt(c.maps / avgMaps) }))
    .sort((a, b) => b.cost - a.cost);
}

function Side({ players, won, flip }: { players: PlayerLine[]; won: boolean; flip?: boolean }) {
  const t = useDict();
  return (
    <ul className={cn("min-w-0 space-y-2", !won && "opacity-60")}>
      {players.map((p) => (
        <li key={p.id} className={cn("flex min-w-0 items-center gap-2", flip && "flex-row-reverse text-right")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.avatar} alt="" loading="lazy" decoding="async" className="size-8 shrink-0" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[0.8rem] font-bold">{p.name}</div>
            <div className={cn("num flex items-baseline gap-1.5 whitespace-nowrap", flip && "flex-row-reverse")}>
              <span className="text-sm">{fmtNum(p.score)}</span>
              <span className="text-[0.7rem] text-ash">{pct(p.acc)}</span>
            </div>
            {p.edited && <div className="text-[0.6rem] font-bold uppercase text-[#e8c547]">{t.match.edited}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function MapCard({ m }: { m: MapResult }) {
  const t = useDict();
  const color = m.mod ? MODS[m.mod]?.color : undefined;
  const sum = m.team1 + m.team2;
  const share = sum ? (m.team1 / sum) * 100 : 50;
  return (
    <article className={cn("relative overflow-hidden border border-line bg-coal", m.note && "opacity-50")}>
      {m.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.cover} alt="" loading="lazy" decoding="async" className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full object-cover opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      )}
      <header className="relative flex items-start gap-3 px-3.5 pt-3">
        <span className="heading-slam shrink-0 text-2xl leading-none" style={{ color: color ?? "var(--color-ash)" }}>
          {m.slot ?? "—"}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="truncate text-sm font-bold leading-tight">{m.title}</div>
          <div className="truncate text-xs text-ash">
            {m.version}
            {m.mods.length > 0 && <span className="ml-1.5">+{m.mods.join("")}</span>}
            {m.note && <span className="ml-1.5 font-bold uppercase text-rose-hi">{t.match.notes[m.note]}</span>}
          </div>
        </div>
        {!m.note && (
          <span className="num shrink-0 text-lg leading-none">
            <span className={m.winner === 1 ? "text-rose-hi" : "text-ash"}>{m.running[0]}</span>
            <span className="px-1 text-ash/40">/</span>
            <span className={m.winner === 2 ? "text-azure-hi" : "text-ash"}>{m.running[1]}</span>
          </span>
        )}
      </header>
      {!m.note && (
        <div className="relative px-3.5 pb-3.5 pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className={cn("num text-xl leading-none", m.winner === 1 ? "text-rose-hi" : "text-ash")}>{fmtNum(m.team1)}</span>
            {sum > 0 && <span className="num text-[0.7rem] text-ash">{fmtNum(Math.abs(m.team1 - m.team2))}</span>}
            <span className={cn("num text-xl leading-none", m.winner === 2 ? "text-azure-hi" : "text-ash")}>{fmtNum(m.team2)}</span>
          </div>
          <div className="mt-2 flex h-1 gap-0.5">
            <span className={cn("h-full bg-rose transition-[width] duration-700", m.winner !== 1 && "opacity-40")} style={{ width: `${share}%` }} />
            <span className={cn("h-full flex-1 bg-azure", m.winner !== 2 && "opacity-40")} />
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-x-4">
            <Side players={m.players[0]} won={m.winner !== 2} />
            <Side players={m.players[1]} won={m.winner !== 1} flip />
          </div>
        </div>
      )}
    </article>
  );
}

function Costs({ data, names }: { data: Scoreboard; names: (string | undefined)[] }) {
  const t = useDict();
  const rows = matchCosts(data);
  if (!rows.length) return null;
  const best = rows[0].id;
  return (
    <section className="pt-3">
      <h3 className="text-sm font-black uppercase">{t.match.cost}</h3>
      <p className="mb-3 mt-1 text-xs text-ash">{t.match.costHint}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([1, 2] as const).map((k) => (
          <div key={k} className={cn("border border-l-[3px] border-line bg-coal", TEAM[k - 1])}>
            <div className={cn("border-b border-line px-3 py-2 text-xs font-black uppercase", TEAM_TEXT[k - 1])}>{names[k - 1]}</div>
            <ul>
              {rows
                .filter((r) => r.team === k)
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatar} alt="" loading="lazy" decoding="async" className="size-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{r.name}</div>
                      <div className="num truncate text-xs text-ash">
                        {t.match.mapsShort(r.maps)} · {pct(r.acc)} · {fmtNum(r.score)}
                      </div>
                    </div>
                    <span className={cn("num shrink-0 text-2xl", r.id === best ? "text-[#e8c547]" : r.cost >= 1 ? "text-paper" : "text-ash")}>{r.cost.toFixed(2)}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Board({ match, data, names }: { match: Match; data: Scoreboard; names: (string | undefined)[] }) {
  const t = useDict();
  return (
    <div className="min-w-0 space-y-4 p-3 sm:space-y-5 sm:p-5">
      {data.maps.map((m, i) => (
        <div key={`${m.lobby}-${i}`}>
          {data.lobbies.length > 1 && (i === 0 || data.maps[i - 1].lobby !== m.lobby) && (
            <div className="mb-3 mt-1 flex items-center gap-3 text-xs font-black uppercase text-ash">
              {t.match.lobby(m.lobby + 1)}
              <span className="h-px flex-1 border-t border-dashed border-line" />
            </div>
          )}
          <MapCard m={m} />
        </div>
      ))}
      {match.winner ? <Costs data={data} names={names} /> : null}
    </div>
  );
}

export function MatchDialog({ match, compact }: { match: Match; compact?: boolean }) {
  const t = useDict();
  const slug = matchSlug(match.id);
  const [data, setData] = useState<Scoreboard | "error" | null>(() => cache.get(slug) ?? null);
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  const names = [teams[0]?.name ?? match.team1.name, teams[1]?.name ?? match.team2.name];
  const score = data && data !== "error" ? data.score : [match.team1.score ?? 0, match.team2.score ?? 0];

  const load = () => {
    const hit = cache.get(slug);
    if (hit) setData(hit);
    if (hit && match.winner) return;
    if (!hit) setData(null);
    fetch(`/api/matches/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Scoreboard) => {
        cache.set(slug, d);
        setData(d);
      })
      .catch(() => !hit && setData("error"));
  };

  return (
    <Dialog onOpenChange={(open) => open && load()}>
      <DialogTrigger
        aria-label={t.match.details}
        title={t.match.details}
        className={cn(
          "flex shrink-0 items-center justify-center text-ash transition hover:text-paper",
          compact ? "size-6 -skew-x-12 border border-line hover:border-rose hover:bg-rose/15" : "w-10 hover:bg-slate sm:w-14",
        )}
      >
        <ListOrdered className={cn(compact ? "size-3.5 skew-x-12" : "size-5")} />
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] grid-cols-[minmax(0,1fr)] gap-0 overflow-y-auto overscroll-contain rounded-none border border-line bg-ink p-0 ring-0 sm:max-w-4xl">
        <div className="sticky top-0 z-10 min-w-0 border-b border-line bg-ink px-3 py-3 sm:px-5 sm:py-4">
          <DialogTitle className="pr-8 text-xs font-black uppercase text-rose-hi">{roundName(t, match.round)}</DialogTitle>
          <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            {teams.map((team, i) => (
              <div key={i} className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i === 1 && "order-3 flex-row-reverse text-right")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {team && <img src={team.image} alt="" className={cn("size-8 shrink-0 border-b-[3px] object-cover sm:size-12", i ? "border-azure" : "border-rose")} />}
                <span className={cn("line-clamp-2 min-w-0 break-words text-xs font-black leading-tight sm:text-lg", match.winner && match.winner !== i + 1 && "text-ash")}>{names[i]}</span>
              </div>
            ))}
            <span className="num order-2 whitespace-nowrap text-2xl sm:text-4xl">
              <span className={match.winner === 2 ? "text-ash" : "text-paper"}>{score[0]}</span>
              <span className="text-ash">-</span>
              <span className={match.winner === 1 ? "text-ash" : "text-paper"}>{score[1]}</span>
            </span>
          </div>
          {match.links.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
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
          )}
        </div>
        {data === null ? (
          <p className="p-10 text-center text-sm text-ash">{t.match.loading}</p>
        ) : data === "error" ? (
          <p className="p-10 text-center text-sm text-rose-hi">{t.match.error}</p>
        ) : (
          <Board match={match} data={data} names={names} />
        )}
      </DialogContent>
    </Dialog>
  );
}
