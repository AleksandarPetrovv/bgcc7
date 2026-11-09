"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useMounted } from "./use-mounted";
import { ExternalLink, Eye } from "lucide-react";
import { Popup, PopupTitle } from "./popup";
import { useDict, useLang } from "./lang";
import { fmtSofia } from "@/lib/time";
import { fmtNum, type Match } from "@/lib/data";
import { slotColor } from "@/lib/format-plan";
import { useTournament } from "./tournament";
import { roundName } from "@/lib/i18n/dict";
import type { MapResult, PlayerLine, Scoreboard } from "@/lib/scoreboard";
import { cn, cssVars } from "@/lib/utils";
import { SlantBg } from "./slant";
import { matchCosts } from "@/lib/match-cost";
import { MeTag } from "./me";
import { Pic } from "./pfp";
import { PlayerRow } from "./player-row";
import { MEDAL, modHi, TEAM as TEAMS } from "@/lib/theme";
import { osuMatch } from "@/lib/links";
import { LineDiamond, RuleDiamond } from "./rule";
import { localeOf } from "@/lib/i18n/locale";
import { MOD_COLOR, MODS } from "@/lib/mods";

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const cache = new Map<string, Scoreboard>();
const OPEN_WAIT_MS = 350;
const TEAM = [TEAMS[1].border, TEAMS[2].border];
const TEAM_TEXT = [TEAMS[1].text, TEAMS[2].text];

function Side({ players, won, flip }: { players: PlayerLine[]; won: boolean; flip?: boolean }) {
  const t = useDict();
  return (
    <ul className={cn("min-w-0 space-y-2", !won && "opacity-60")}>
      {players.map((p, r) => (
        <PlayerRow key={p.id} id={p.id} avatar={p.avatar} lazy pfpClass="size-8" className={cn("min-w-0 gap-2 py-0.5", flip ? "in-right flex-row-reverse pr-1.5 text-right" : "in-left pl-1.5")} style={cssVars({ "--d": `${0.45 + r * 0.06}s` })}>
          <div className="min-w-0 flex-1 leading-tight">
            <div className={cn("flex min-w-0 items-center text-[0.8rem] font-display font-bold", flip && "flex-row-reverse")}>
              <span className="truncate">{p.name}</span>
              <MeTag p={p.id} />
            </div>
            <div className={cn("num flex flex-wrap items-baseline gap-x-1.5", flip && "flex-row-reverse")}>
              <span className="text-sm">{fmtNum(p.score)}</span>
              <span className="text-[0.7rem] text-ash">{pct(p.acc)}</span>
            </div>
            {p.edited && <div className="text-[0.6rem] font-display font-bold text-gold-hi">{t.match.edited}</div>}
          </div>
        </PlayerRow>
      ))}
    </ul>
  );
}

function ModBadge({ mods }: { mods: string[] }) {
  const c = modHi(MOD_COLOR[mods[0] ?? "NM"] ?? "var(--ash)");
  return (
    <span className="in-pop relative isolate px-1.5 py-0.5 text-[0.6rem] font-display font-black leading-none" style={{ color: c, ...cssVars({ "--d": "0.45s" }) }}>
      <SlantBg className="border" style={{ borderColor: c }} />
      {mods.join("") || "NM"}
    </span>
  );
}

export function MapCard({ m, i, className }: { m: MapResult; i: number; className?: string }) {
  const t = useDict();
  const color = modHi(m.slot ? slotColor(m.slot) : m.mod ? MODS[m.mod]?.color : undefined);
  const sum = m.team1 + m.team2;
  const share = sum ? (m.team1 / sum) * 100 : 50;
  return (
    <article
      className={cn("in-up relative border-b-2 border-dashed border-line", m.note && "opacity-50", className)}
      style={cssVars({ "--i": Math.min(i, 6), "--s": "0.08s", "--d": "0.12s" })}
    >
      <RuleDiamond />
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
      <header className="relative flex items-start gap-3 pt-3">
        <span className="in-slam heading-slam shrink-0 text-2xl leading-none" style={{ color: color ?? "var(--ash)", ...cssVars({ "--d": "0.22s" }) }}>
          {m.slot ?? "—"}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="truncate text-sm font-display font-bold leading-tight">{m.title}</div>
          <div className="truncate text-xs text-ash">
            {m.version && `[${m.version}]`}
            {m.note && <span className="ml-1.5 font-display font-bold text-rose-hi">{t.match.notes[m.note]}</span>}
          </div>
        </div>
        {!m.note && (
          <span className="in-pop num shrink-0 text-lg leading-none" style={cssVars({ "--d": "0.5s" })}>
            <span className={m.winner === 1 ? "text-crimson-hi" : "text-ash"}>{m.running[0]}</span>
            <span className="px-1 text-ash/40">/</span>
            <span className={m.winner === 2 ? "text-azure-hi" : "text-ash"}>{m.running[1]}</span>
          </span>
        )}
      </header>
      {!m.note && (
        <div className="relative pb-4 pt-3">
          <div className="flex items-end justify-between gap-3">
            <span className={cn("in-left num text-xl leading-none", m.winner === 1 ? "text-crimson-hi" : "text-ash")} style={cssVars({ "--d": "0.3s" })}>
              {fmtNum(m.team1)}
            </span>
            <div className="flex flex-col items-center gap-1.5">
              <ModBadge mods={m.mods} />
              {sum > 0 && (
                <span className="in-drop num text-[0.7rem] leading-none text-ash" style={cssVars({ "--d": "0.55s" })}>
                  {fmtNum(Math.abs(m.team1 - m.team2))}
                </span>
              )}
            </div>
            <span className={cn("in-right num text-xl leading-none", m.winner === 2 ? "text-azure-hi" : "text-ash")} style={cssVars({ "--d": "0.3s" })}>
              {fmtNum(m.team2)}
            </span>
          </div>
          <div className="mt-2 flex h-1 gap-0.5">
            <span className={cn("in-grow h-full bg-crimson", m.winner !== 1 && "opacity-40")} style={{ width: `${share}%`, ...cssVars({ "--d": "0.35s" }) }} />
            <span className={cn("in-grow h-full flex-1 bg-azure", m.winner !== 2 && "opacity-40")} style={{ transformOrigin: "100% 50%", ...cssVars({ "--d": "0.35s" }) }} />
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

export function Costs({ data, names, finished }: { data: Scoreboard; names: (string | undefined)[]; finished: boolean }) {
  const t = useDict();
  const rows = matchCosts(data, finished);
  if (!rows.length) return null;
  const place = new Map(rows.map((r, i) => [r.id, i]));
  return (
    <section className="in-up pt-3" style={cssVars({ "--d": "0.35s" })}>
      <h3 className="in-wipe mb-3 text-sm font-display font-bold" style={cssVars({ "--d": "0.45s" })}>
        {t.match.cost}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([1, 2] as const).map((k) => (
          <div key={k} className={cn("border-l-[3px] pl-3", TEAM[k - 1])}>
            <div className={cn("flex items-center gap-2 border-b border-line pb-2 text-xs font-display font-black", TEAM_TEXT[k - 1])}>
              <span className="size-2 shrink-0 rotate-45 bg-current" aria-hidden />
              {names[k - 1]}
            </div>
            <ul>
              {rows
                .filter((r) => r.team === k)
                .map((r, n) => (
                  <PlayerRow
                    key={r.id}
                    id={r.id}
                    avatar={r.avatar}
                    lazy
                    pfpClass="size-8"
                    className={cn("gap-3 border-b border-line py-2 last:border-b-0", k === 1 ? "in-left" : "in-right")}
                    style={cssVars({ "--i": n, "--s": "0.07s", "--d": "0.55s" })}
                    end={
                      <span className={cn("in-slam num shrink-0 text-2xl", MEDAL[place.get(r.id)!] ?? "text-paper/60")} style={cssVars({ "--d": `${0.75 + place.get(r.id)! * 0.06}s` })}>
                        {r.cost.toFixed(2)}
                      </span>
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center font-display font-bold">
                        <span className="truncate">{r.name}</span>
                        <MeTag p={r.id} />
                      </div>
                      <div className="num truncate text-xs text-ash">
                        {t.match.mapsShort(r.maps)} · {pct(r.acc)} · {fmtNum(r.score)}
                      </div>
                    </div>
                  </PlayerRow>
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
  const played = data.maps.filter((m) => !m.note);
  return (
    <div className="min-w-0 space-y-5 py-3 pl-(--px) pr-[calc(var(--px)+var(--sbw,0px))] sm:space-y-6 sm:py-5">
      {played.map((m, i) => (
        <div key={`${m.lobby}-${i}`}>
          {data.lobbies.length > 1 && (i === 0 || played[i - 1].lobby !== m.lobby) && (
            <div className="mb-3 mt-1 flex items-center gap-3 text-xs font-display font-bold text-ash">
              {t.match.lobby(m.lobby + 1)}
              <LineDiamond line="border-t" />
            </div>
          )}
          <MapCard m={m} i={i} className="-ml-(--px) -mr-[calc(var(--px)+var(--sbw,0px))] pl-(--px) pr-[calc(var(--px)+var(--sbw,0px))]" />
        </div>
      ))}
      <Costs data={data} names={names} finished={!!match.winner} />
    </div>
  );
}

export function MatchDialog({ match, compact, children, className }: { match: Match; compact?: boolean; children?: React.ReactNode; className?: string }) {
  const t = useDict();
  const slug = match.id;
  const [data, setData] = useState<Scoreboard | "error" | null>(() => cache.get(slug) ?? null);
  const { teamById } = useTournament();
  const teams = [teamById(match.team1.id), teamById(match.team2.id)];
  const names = [teams[0]?.name ?? match.team1.name, teams[1]?.name ?? match.team2.name];
  const score = data && data !== "error" ? data.score : [match.team1.score ?? 0, match.team2.score ?? 0];
  const lang = useLang();
  const when = match.datetime ? fmtSofia(new Date(match.datetime), localeOf(lang)) : null;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [loads, setLoads] = useState(0);
  const load = () => {
    const hit = cache.get(slug);
    if (hit) {
      setData(hit);
      setOpen(true);
    } else setBusy(true);
    setLoads((n) => n + 1);
  };
  const fetchScores = useEffectEvent(() => {
    const hit = cache.get(slug);
    let shown = !!hit;
    const show = () => {
      if (shown) return;
      shown = true;
      setBusy(false);
      setOpen(true);
    };
    if (hit) {
      if (match.winner) return;
    } else setTimeout(show, OPEN_WAIT_MS);
    fetch(`/api/matches/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Scoreboard) => {
        cache.set(slug, d);
        setData(d);
      })
      .catch(() => !hit && setData("error"))
      .finally(show);
  });
  useEffect(() => {
    if (loads) fetchScores();
  }, [loads]);

  // the open popup lives at /results/<slug> so it can be linked (discord #results); back closes it
  const url = `/results/${slug}`;
  // opening from the url can only happen after mount (no location on the server)
  const mounted = useMounted();
  const [urlChecked, setUrlChecked] = useState(false);
  if (mounted && !urlChecked) {
    setUrlChecked(true);
    if (location.pathname === url) load();
  }
  useEffect(() => {
    if (!open) return;
    const pushed = location.pathname !== url;
    if (pushed) history.pushState(null, "", url);
    const onPop = () => location.pathname !== url && setOpen(false);
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("popstate", onPop);
      if (location.pathname !== url) return;
      if (pushed) history.back();
      else history.replaceState(null, "", "/matches");
    };
  }, [open, url]);

  return (
    <>
      <button
        type="button"
        onClick={() => !busy && load()}
        aria-label={t.match.details}
        title={t.match.details}
        className={
          children
            ? className
            : cn(
                "group flex shrink-0 items-center justify-center",
                compact ? "-mr-1 size-6" : "px-2 hover:bg-slate sm:px-3",
              )
        }
      >
        {children ?? (compact ? <Eye className="size-[0.92rem] text-rose transition-colors duration-200 group-hover:text-rose-hi" strokeWidth={2.25} aria-hidden /> : <DetailsChip />)}
      </button>
      <Popup open={open} onClose={() => setOpen(false)} tone="line" shadow={0} className="grid w-full max-w-[calc(100%-2rem)] text-sm max-h-[88dvh] grid-cols-[minmax(0,1fr)] content-start gap-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [--px:0.75rem] sm:[--px:1.25rem] [touch-action:pan-y] rounded-none border border-line bg-ink p-0 ring-0 sm:max-w-4xl">
        {/* -top-px + the upward shadow close the sliver that let scrolled maps peek above the header */}
        <div className="sticky -top-px z-10 min-w-0 border-b border-line bg-ink py-3 pl-(--px) pr-[calc(var(--px)+var(--sbw,0px))] shadow-[0_-8px_0_0_var(--ink)] sm:py-4">
          <PopupTitle className="in-wipe pr-8 text-xs font-display font-bold text-rose-hi" style={cssVars({ "--d": "0.1s" })}>
            {roundName(t, match.round)}
          </PopupTitle>
          {/* min-content on phones lets the date wrap so team names don't break mid-word */}
          <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_min-content_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
            {teams.map((team, i) => (
              <div
                key={i}
                className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i === 1 ? "in-right order-3 flex-row-reverse text-right" : "in-left")}
                style={cssVars({ "--d": "0.12s" })}
              >
                {team && <Pic src={team.image} className="size-8 shrink-0 rounded-full object-cover sm:size-12" />}
                <span className={cn("line-clamp-2 min-w-0 break-words text-xs font-display font-black leading-tight sm:text-lg", match.winner && match.winner !== i + 1 && "text-ash")}>
                  {names[i]}
                </span>
              </div>
            ))}
            <span className="in-slam order-2 flex flex-col items-center gap-1.5" style={cssVars({ "--d": "0.25s" })}>
              <span className="num whitespace-nowrap text-2xl leading-none sm:text-4xl">
                <span className={match.winner === 2 ? "text-ash" : "text-paper"}>{score[0]}</span>
                <span className="mx-2 text-ash sm:mx-3">–</span>
                <span className={match.winner === 1 ? "text-ash" : "text-paper"}>{score[1]}</span>
              </span>
              {when && <span className="num text-center text-[0.7rem] italic leading-tight sm:whitespace-nowrap sm:leading-none text-paper/70 sm:text-[0.8rem]">{when}</span>}
            </span>
          </div>
          {match.links.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {match.links.map((id, i) => (
                <a
                  key={id}
                  href={osuMatch(id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 border border-line px-2 py-1 text-[0.7rem] font-display font-bold text-ash transition hover:border-paper/40 hover:text-paper"
                >
                  {match.links.length > 1 ? t.match.lobby(i + 1) : "osu! mp"} <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          )}
        </div>
        {data === null ? (
          <div className={`space-y-4 py-3 pl-(--px) pr-[calc(var(--px)+var(--sbw,0px))] sm:py-5`} aria-busy>
            {[0, 1, 2].map((k) => (
              <div key={k} className="in-up relative h-40 overflow-hidden border-b border-line" style={cssVars({ "--i": k, "--s": "0.1s" })}>
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
        <ScrollThumb />
      </Popup>
    </>
  );
}

// the native scrollbar takes a lane the map rows can't paint under, so it's hidden and this thumb floats over the edge; --sbw keeps the content where it sat
function ScrollThumb() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const box = el.parentElement!;
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;width:100px;height:100px;overflow:scroll;visibility:hidden";
    box.append(probe);
    const lane = 100 - probe.clientWidth;
    probe.remove();
    const sync = () => {
      const { scrollHeight: s, clientHeight: c } = box;
      // rubber-band scrolling (mac trackpads, iOS) reports a scrollTop past the end; an unclamped thumb would then grow the scroll area forever
      const t = Math.min(Math.max(box.scrollTop, 0), s - c);
      const over = s > c + 1;
      const h = Math.max(32, (c * c) / s);
      box.style.setProperty("--sbw", over ? `${lane}px` : "0px");
      el.style.display = over ? "" : "none";
      el.style.height = `${h}px`;
      el.style.transform = `translateY(${t + (over ? (t / (s - c)) * (c - h) : 0)}px)`;
    };
    sync();
    box.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(box);
    const mo = new MutationObserver(sync);
    mo.observe(box, { childList: true, subtree: true });
    let drag: { y: number; top: number } | null = null;
    const down = (e: PointerEvent) => {
      drag = { y: e.clientY, top: box.scrollTop };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const { scrollHeight: s, clientHeight: c } = box;
      box.scrollTop = drag.top + ((e.clientY - drag.y) * (s - c)) / (c - Math.max(32, (c * c) / s));
    };
    const up = () => (drag = null);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      box.removeEventListener("scroll", sync);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return <span ref={ref} aria-hidden className="absolute right-0.5 top-0 z-20 w-1.5 cursor-default touch-none bg-line transition-[background-color] hover:bg-paper/40" />;
}

export function DetailsChip() {
  return (
    <span className="relative isolate inline-flex h-5 w-[30px] items-center justify-center text-white transition-[translate] duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
      <SlantBg className="bg-rose shadow-[2px_2px_0_0_var(--rose-deep)] transition-[background-color,box-shadow] duration-200 group-hover:bg-rose-hi group-hover:shadow-[4px_4px_0_0_var(--rose-deep)]" />
      <Eye className="size-[15px]" strokeWidth={2} aria-hidden />
    </span>
  );
}
