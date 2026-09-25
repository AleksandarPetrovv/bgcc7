"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDict } from "./lang";
import { MODS, fmtNum, type Match } from "@/lib/data";
import { useTournament } from "./tournament";
import { roundName } from "@/lib/i18n/dict";
import { matchSlug } from "@/lib/matches";
import type { MapResult, PlayerLine, Scoreboard } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";
import { matchCosts, MEDAL } from "@/lib/match-cost";

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const v = (o: Record<string, string | number>) => o as React.CSSProperties;
const cache = new Map<string, Scoreboard>();
const TEAM = ["border-rose", "border-azure"];
const TEAM_TEXT = ["text-rose-hi", "text-azure-hi"];

function Side({ players, won, flip }: { players: PlayerLine[]; won: boolean; flip?: boolean }) {
  const t = useDict();
  return (
    <ul className={cn("min-w-0 space-y-2", !won && "opacity-60")}>
      {players.map((p, r) => (
        <li key={p.id} className={cn("flex min-w-0 items-center gap-2", flip ? "in-right flex-row-reverse text-right" : "in-left")} style={v({ "--d": `${0.45 + r * 0.06}s` })}>
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

function MapCard({ m, i }: { m: MapResult; i: number }) {
  const t = useDict();
  const color = m.mod ? MODS[m.mod]?.color : undefined;
  const sum = m.team1 + m.team2;
  const share = sum ? (m.team1 / sum) * 100 : 50;
  return (
    <article
      className={cn("in-up relative overflow-hidden border border-line bg-coal", m.note && "opacity-50")}
      style={v({ "--i": Math.min(i, 6), "--s": "0.08s", "--d": "0.12s" })}
    >
      {m.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full object-cover opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        />
      )}
      <header className="relative flex items-start gap-3 px-3.5 pt-3">
        <span className="in-slam heading-slam shrink-0 text-2xl leading-none" style={{ color: color ?? "var(--color-ash)", ...v({ "--d": "0.22s" }) }}>
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
          <span className="in-pop num shrink-0 text-lg leading-none" style={v({ "--d": "0.5s" })}>
            <span className={m.winner === 1 ? "text-rose-hi" : "text-ash"}>{m.running[0]}</span>
            <span className="px-1 text-ash/40">/</span>
            <span className={m.winner === 2 ? "text-azure-hi" : "text-ash"}>{m.running[1]}</span>
          </span>
        )}
      </header>
      {!m.note && (
        <div className="relative px-3.5 pb-3.5 pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className={cn("in-left num text-xl leading-none", m.winner === 1 ? "text-rose-hi" : "text-ash")} style={v({ "--d": "0.3s" })}>
              {fmtNum(m.team1)}
            </span>
            {sum > 0 && (
              <span className="in-drop num text-[0.7rem] text-ash" style={v({ "--d": "0.55s" })}>
                {fmtNum(Math.abs(m.team1 - m.team2))}
              </span>
            )}
            <span className={cn("in-right num text-xl leading-none", m.winner === 2 ? "text-azure-hi" : "text-ash")} style={v({ "--d": "0.3s" })}>
              {fmtNum(m.team2)}
            </span>
          </div>
          <div className="mt-2 flex h-1 gap-0.5">
            <span className={cn("in-grow h-full bg-rose", m.winner !== 1 && "opacity-40")} style={{ width: `${share}%`, ...v({ "--d": "0.35s" }) }} />
            <span className={cn("in-grow h-full flex-1 bg-azure", m.winner !== 2 && "opacity-40")} style={{ transformOrigin: "100% 50%", ...v({ "--d": "0.35s" }) }} />
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

function Costs({ data, names, finished }: { data: Scoreboard; names: (string | undefined)[]; finished: boolean }) {
  const t = useDict();
  const rows = matchCosts(data, finished);
  if (!rows.length) return null;
  const place = new Map(rows.map((r, i) => [r.id, i]));
  return (
    <section className="in-up pt-3" style={v({ "--d": "0.35s" })}>
      <h3 className="in-wipe mb-3 text-sm font-black uppercase" style={v({ "--d": "0.45s" })}>
        {t.match.cost}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([1, 2] as const).map((k) => (
          <div key={k} className={cn("border border-l-[3px] border-line bg-coal", TEAM[k - 1])}>
            <div className={cn("border-b border-line px-3 py-2 text-xs font-black uppercase", TEAM_TEXT[k - 1])}>{names[k - 1]}</div>
            <ul>
              {rows
                .filter((r) => r.team === k)
                .map((r, n) => (
                  <li
                    key={r.id}
                    className={cn("flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0", k === 1 ? "in-left" : "in-right")}
                    style={v({ "--i": n, "--s": "0.07s", "--d": "0.55s" })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatar} alt="" loading="lazy" decoding="async" className="size-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{r.name}</div>
                      <div className="num truncate text-xs text-ash">
                        {t.match.mapsShort(r.maps)} · {pct(r.acc)} · {fmtNum(r.score)}
                      </div>
                    </div>
                    <span className={cn("in-slam num shrink-0 text-2xl", MEDAL[place.get(r.id)!] ?? "text-paper/60")} style={v({ "--d": `${0.75 + place.get(r.id)! * 0.06}s` })}>
                      {r.cost.toFixed(2)}
                    </span>
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
          <MapCard m={m} i={i} />
        </div>
      ))}
      <Costs data={data} names={names} finished={!!match.winner} />
    </div>
  );
}

export function MatchDialog({ match, compact, children, className }: { match: Match; compact?: boolean; children?: React.ReactNode; className?: string }) {
  const t = useDict();
  const slug = matchSlug(match.id);
  const [data, setData] = useState<Scoreboard | "error" | null>(() => cache.get(slug) ?? null);
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  const names = [teams[0]?.name ?? match.team1.name, teams[1]?.name ?? match.team2.name];
  const score = data && data !== "error" ? data.score : [match.team1.score ?? 0, match.team2.score ?? 0];

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [veil, setVeil] = useState<"in" | "out" | null>(null);

  const load = () => {
    const hit = cache.get(slug);
    if (hit) {
      setData(hit);
      setOpen(true);
      if (match.winner) return;
    } else {
      setBusy(true);
      setVeil("in");
    }
    fetch(`/api/matches/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Scoreboard) => {
        cache.set(slug, d);
        setData(d);
      })
      .catch(() => !hit && setData("error"))
      .finally(() => {
        setBusy(false);
        setOpen(true);
        setVeil((v) => (v ? "out" : null));
        setTimeout(() => setVeil(null), 700);
      });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? !busy && load() : setOpen(false))}>
        <DialogTrigger
          aria-label={t.match.details}
          title={t.match.details}
          className={
            children
              ? className
              : cn(
                  "group flex shrink-0 items-center justify-center",
                  compact ? "-mr-1 h-6" : "px-2 hover:bg-slate sm:px-3",
                )
          }
        >
          {children ?? <DetailsChip />}
        </DialogTrigger>
        <DialogContent className="mdlg max-h-[88dvh] grid-cols-[minmax(0,1fr)] content-start gap-0 overflow-y-auto [-webkit-overflow-scrolling:touch] [touch-action:pan-y] rounded-none border border-line bg-ink p-0 ring-0 sm:max-w-4xl">
          <div className="sticky top-0 z-10 min-w-0 border-b border-line bg-ink px-3 py-3 sm:px-5 sm:py-4">
            <DialogTitle className="in-wipe pr-8 text-xs font-black uppercase text-rose-hi" style={v({ "--d": "0.1s" })}>
              {roundName(t, match.round)}
            </DialogTitle>
            <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
              {teams.map((team, i) => (
                <div
                  key={i}
                  className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i === 1 ? "in-right order-3 flex-row-reverse text-right" : "in-left")}
                  style={v({ "--d": "0.12s" })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {team && <img src={team.image} alt="" className={cn("size-8 shrink-0 border-b-[3px] object-cover sm:size-12", i ? "border-azure" : "border-rose")} />}
                  <span className={cn("line-clamp-2 min-w-0 break-words text-xs font-black leading-tight sm:text-lg", match.winner && match.winner !== i + 1 && "text-ash")}>
                    {names[i]}
                  </span>
                </div>
              ))}
              <span className="in-slam num order-2 whitespace-nowrap text-2xl sm:text-4xl" style={v({ "--d": "0.25s" })}>
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
            <div className="space-y-4 p-3 sm:p-5" aria-busy>
              <p className="text-center text-xs font-black uppercase text-ash">{t.match.loading}</p>
              {[0, 1, 2].map((k) => (
                <div key={k} className="in-up relative h-40 overflow-hidden border border-line bg-coal" style={v({ "--i": k, "--s": "0.1s" })}>
                  <span className="mdlg-shine absolute inset-0" style={{ animationDelay: `${k * 0.15}s` }} />
                  <span className="absolute left-3.5 top-3 h-6 w-12 -skew-x-12 bg-slate" />
                  <span className="absolute left-20 top-3.5 h-3 w-1/2 bg-slate" />
                  <span className="absolute inset-x-3.5 top-16 flex h-1 gap-0.5">
                    <span className="w-1/2 bg-rose/30" />
                    <span className="flex-1 bg-azure/30" />
                  </span>
                </div>
              ))}
            </div>
          ) : data === "error" ? (
            <p className="p-10 text-center text-sm text-rose-hi">{t.match.error}</p>
          ) : (
            <Board match={match} data={data} names={names} />
          )}
        </DialogContent>
      </Dialog>
      {veil && <LoadingVeil out={veil === "out"} />}
    </>
  );
}

export function DetailsChip() {
  return (
    <span className="relative inline-flex h-5 w-[30px] -skew-x-12 items-center justify-center overflow-hidden border border-rose bg-rose text-white shadow-[2px_2px_0_0_var(--color-rose-deep)] transition-[background-color,transform,box-shadow] duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-rose-hi group-hover:shadow-[4px_4px_0_0_var(--color-rose-deep)]">
      <Eye className="size-[15px] skew-x-12" strokeWidth={2} aria-hidden />
      <span className="eye-sheen pointer-events-none absolute -inset-y-0.5 -left-3 w-1.5 bg-white/60" aria-hidden />
    </span>
  );
}

function LoadingVeil({ out }: { out: boolean }) {
  const t = useDict();
  return createPortal(
    <div
      className={cn("fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/75 fade-in-0 transition-opacity duration-700 ease-out", out && "pointer-events-none opacity-0")}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-10 items-end gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="mdlg-bar w-2 -skew-x-12 bg-rose" style={{ animationDelay: `${i * 0.09}s` }} />
          ))}
        </div>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-paper/80">{t.match.loading}</span>
      </div>
    </div>,
    document.body,
  );
}
