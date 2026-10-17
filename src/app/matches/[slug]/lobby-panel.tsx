"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpDown, Check, CircleHelp, X, Copy, DoorClosed, ExternalLink, Lock, LockOpen, Map as MapIcon, MoveVertical, OctagonX, Play, Plus, RefreshCw, Send, Timer, TimerOff, TriangleAlert, UserPlus, UserX, Users, WifiOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { useSSE } from "@/components/site/use-sse";
import { useFormat } from "@/components/site/tournament";
import { lobbySize } from "@/lib/format";
import { EASE } from "@/components/site/motion";
import type { Beatmap } from "@/lib/data";
import type { LobbyView } from "@/lib/bancho";
import { slotColor } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { LOBBY_TEAM, MOD_COLOR } from "@/lib/theme";
import { osuMp } from "@/lib/links";

const TEAM_C = LOBBY_TEAM;
const MOD_C = MOD_COLOR;
const POP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const;

export async function lobbyPost(slug: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/lobby/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return ((await r?.json().catch(() => null)) ?? null) as { ok: boolean; error?: string } | null;
}

function IconBtn({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className={cn("inline-flex h-7 w-8 -skew-x-12 items-center justify-center border border-line text-ash transition-colors hover:border-paper hover:text-paper disabled:opacity-40", className)}>
      <span className="inline-flex skew-x-12">{children}</span>
    </button>
  );
}

function Btn({ onClick, disabled, tone = "line", wide, children }: { onClick: () => void; disabled?: boolean; tone?: "line" | "go" | "warn" | "bad"; wide?: boolean; children: React.ReactNode }) {
  const cls = {
    line: "border-line text-paper hover:border-paper",
    go: "border-balkan bg-balkan text-ink hover:bg-paper hover:border-paper",
    warn: "border-gold text-gold hover:bg-gold/10",
    bad: "border-rose text-rose-hi hover:bg-rose/10",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex min-h-8 min-w-0 -skew-x-12 items-center border px-3 text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-50", wide && "justify-center px-1.5", cls)}
    >
      <span className="inline-flex min-w-0 skew-x-12 items-center gap-1.5 whitespace-nowrap [&>svg]:shrink-0">{children}</span>
    </button>
  );
}

const HELP_C = ["var(--color-azure)", "var(--color-azure)", "var(--color-azure)", "var(--color-azure)", "var(--color-paper)", "var(--color-gold)", "var(--color-gold)", "var(--color-balkan)", "var(--color-gold)", "var(--color-rose)"];

function LobbyHelp({ onClose }: { onClose: () => void }) {
  const t = useDict();
  const size = String(lobbySize(useFormat()));
  const fill = (s: string) => s.replaceAll("%size%", size);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden border-2 border-paper/80 bg-coal shadow-[8px_8px_0_0_rgba(0,0,0,0.5)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <CircleHelp className="size-7 text-paper" />
          <h3 className="heading-slam text-2xl sm:text-3xl">{t.lobby.helpTitle}</h3>
          <button type="button" onClick={onClose} className="ml-auto inline-flex size-9 items-center justify-center border border-line text-ash transition-colors hover:border-paper hover:text-paper" aria-label={t.draft.cancel}>
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <ul className="space-y-4">
            {t.lobby.helpItems.map((h, i) => (
              <motion.li
                key={h.k}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + i * 0.03, ease: EASE }}
                className="grid gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4"
              >
                <span className="self-start">
                  <span className="inline-flex -skew-x-12 border px-2.5 py-1 text-xs font-black uppercase tracking-wide" style={{ borderColor: HELP_C[i], color: HELP_C[i] }}>
                    <span className="skew-x-12">{h.k}</span>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-relaxed text-paper/85">{fill(h.body)}</span>
                  {h.ex && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {h.ex.map((x) => (
                        <code key={x} className="border border-line bg-ink px-2 py-0.5 text-xs font-bold text-paper">
                          {fill(x)}
                        </code>
                      ))}
                    </span>
                  )}
                </span>
              </motion.li>
            ))}
          </ul>
          <div className="mt-7 border-t border-dashed border-line pt-5">
            <div className="text-[0.7rem] font-black uppercase tracking-widest text-ash">{t.lobby.helpExtra}</div>
            <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {t.lobby.helpCmds.map(([cmd, what]) => (
                <li key={cmd} className="flex flex-col gap-0.5">
                  <code className="text-xs font-bold text-paper">{cmd}</code>
                  <span className="text-xs text-ash">{what}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LobbyAsk({ kind, warn = [], onCancel, onGo }: { kind: "start" | "abort" | "close"; warn?: string[]; onCancel: () => void; onGo: (secs: number) => void }) {
  const t = useDict();
  const [secs, setSecs] = useState(10);
  const [custom, setCustom] = useState("");
  const tone = { start: { c: "var(--color-balkan)", deep: "var(--color-balkan-deep)", Icon: Play }, abort: { c: "var(--color-gold)", deep: "var(--color-gold-deep)", Icon: OctagonX }, close: { c: "var(--color-rose)", deep: "var(--color-rose-deep)", Icon: DoorClosed } }[kind];
  const copy = { start: [t.lobby.startTitle, null, t.lobby.start], abort: [t.lobby.abortTitle, t.lobby.abortBody, t.lobby.abort], close: [t.lobby.closeTitle, t.lobby.closeBody, t.lobby.closeYes] }[kind];
  const pickSecs = custom ? Math.min(300, Math.max(0, Math.round(Number(custom)) || 0)) : secs;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border-2 bg-coal p-6"
        style={{ borderColor: tone.c, boxShadow: `8px 8px 0 0 ${tone.deep}` }}
        role="dialog"
        aria-modal="true"
      >
        <tone.Icon className={cn("size-8", kind === "start" && "fill-current")} style={{ color: tone.c }} />
        <h3 className="heading-slam mt-2 text-3xl">{copy[0]}</h3>
        {copy[1] && <p className="mt-1 text-sm font-bold text-paper/70">{copy[1]}</p>}
        {kind === "start" && warn.length > 0 && (
          <div className="mt-4 border border-gold/50 bg-gold/10 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-gold">
              <TriangleAlert className="size-3.5" /> {t.lobby.notAllReady}
            </div>
            <ul className="mt-1 space-y-0.5 text-sm font-bold text-paper/85">
              {warn.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {kind === "start" && (
          <div className="mt-5">
            <div className="text-[0.65rem] font-black uppercase tracking-widest text-ash">{t.lobby.startIn}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 5, 10, 15, 30].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSecs(s);
                    setCustom("");
                  }}
                  className={cn(
                    "num min-h-9 min-w-12 -skew-x-12 border px-2.5 text-sm font-black transition-colors",
                    !custom && secs === s ? "border-balkan bg-balkan text-ink" : "border-line text-paper hover:border-paper",
                  )}
                >
                  <span className="inline-block skew-x-12">{s ? `${s}s` : t.lobby.now}</span>
                </button>
              ))}
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder={t.lobby.secs}
                className={cn("adm-bare num min-h-9 w-20 border bg-ink px-2 text-sm outline-none", custom ? "border-balkan" : "border-line focus:border-paper")}
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2.5">
          <motion.button
            type="button"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onGo(pickSecs)}
            className={cn("flex min-h-12 -skew-x-6 items-center px-5 text-left font-black uppercase tracking-wide", kind === "close" ? "text-white" : "text-ink")}
            style={{ background: tone.c, boxShadow: `5px 5px 0 0 ${tone.deep}` }}
          >
            <span className="inline-flex skew-x-6 items-center gap-2">
              <tone.Icon className={cn("size-4", kind === "start" && "fill-current")} /> {copy[2]}
              {kind === "start" && <span className="num normal-case">{pickSecs ? `· ${pickSecs}s` : `· ${t.lobby.now}`}</span>}
            </span>
          </motion.button>
          <button type="button" onClick={onCancel} className="mt-1 text-xs font-black uppercase tracking-wide text-ash hover:text-paper">
            {t.draft.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function LobbyPanel({ slug, maps, onOpen, readOnly: viewOnly }: { slug: string; maps: Beatmap[]; onOpen: (open: boolean) => void; readOnly?: boolean }) {
  const t = useDict();
  const format = useFormat();
  const [v, setV] = useState<LobbyView | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinCopied, setJoinCopied] = useState(false);
  const [picking, setPicking] = useState<{ slot: number; mode: "swap" | "move" } | null>(null);
  const [ask, setAsk] = useState<"start" | "abort" | "close" | null>(null);
  const [help, setHelp] = useState(false);
  const [say, setSay] = useState("");
  const sayRef = useRef<HTMLInputElement>(null);
  const fill = (cmd: string) => {
    setSay(cmd);
    requestAnimationFrame(() => {
      const el = sayRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  };

  useSSE(`/api/lobby/${slug}`, (raw) => {
    try {
      const next = JSON.parse(raw) as LobbyView | null;
      if (next) setV(next);
    } catch {}
  });

  const open = v?.state === "open";
  const readOnly = viewOnly || v?.mine === false;
  useEffect(() => onOpen(open), [open, onOpen]);

  const run = (body: Record<string, unknown>) =>
    start(async () => {
      setErr(false);
      const res = await lobbyPost(slug, body);
      if (!res?.ok) setErr(true);
    });

  if (!v || (readOnly && v.state !== "open")) return null;
  const map = v.mapId ? maps.find((m) => m.id === v.mapId) : undefined;
  const offline = v.bot !== "online";
  const link = v.mpId ? osuMp(v.mpId) : null;
  const base = lobbySize(format);
  const all = Array.from({ length: Math.max(v.size, base + 1) }, (_, i) => v.slots[i] ?? null);
  const targets = (i: number, mode: "swap" | "move") =>
    all.map((s, k) => k).filter((k) => k !== i && (mode === "swap" ? !!all[k] : !all[k] && (k < base || (k === base && v.spare))));
  const warn = all.flatMap((s) => (s && s.ready !== "ready" ? [`${s.name}: ${t.lobby.ready[s.ready]}`] : []));
  const seated = all.filter(Boolean).length;
  if (seated < base) warn.unshift(t.lobby.fewPlayers(seated, base));

  const slotBox = (s: LobbyView["slots"][number], i: number) => {
    const spareSlot = i === base;
    const locked = spareSlot && !v.spare && !s;
    return (
      <motion.div
        key={s ? `${i}-${s.name}` : `e${i}`}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
        className={cn("relative flex min-h-16 items-center gap-2 bg-coal px-3 py-2.5", spareSlot && "border-x border-dashed border-line")}
      >
        {s ? (
          <>
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: s.team ? TEAM_C[s.team] : "var(--color-line)" }} />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="num w-4 shrink-0 text-[0.7rem] font-black text-ash">{i + 1}</span>
                <span className={cn("min-w-0 truncate text-sm font-black", s.team === "red" ? "text-rose-hi" : s.team === "blue" ? "text-azure-hi" : "text-ash")}>{s.name}</span>
              </span>
              <span className="flex flex-col items-start gap-1.5 pl-6">
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                <span
                  className={cn(
                    "inline-flex -skew-x-12 items-center whitespace-nowrap border px-1.5 text-[0.6rem] font-black uppercase leading-4 tracking-wide",
                    s.ready === "ready" ? "border-balkan bg-balkan text-ink" : s.ready === "nomap" ? "border-rose text-rose-hi" : "border-line text-ash",
                  )}
                >
                  <span className="inline-flex skew-x-12 items-center gap-1">
                    {s.ready === "ready" && <Check className="size-3" strokeWidth={3} />}
                    {t.lobby.ready[s.ready]}
                  </span>
                </span>
                {v.freemod && (
                  <>
                    {!s.mods.includes("NF") && (
                      <span title={t.lobby.noNf} className="-skew-x-12 border border-paper/40 px-1.5 text-[0.6rem] font-black leading-4 text-paper/50">
                        <span className="inline-block skew-x-12 line-through decoration-rose-hi decoration-2">NF</span>
                      </span>
                    )}
                    {s.mods.map((m) => (
                      <span key={m} className="-skew-x-12 border px-1.5 text-[0.6rem] font-black leading-4" style={{ borderColor: MOD_C[m] ?? "var(--color-line)", color: MOD_C[m] ?? "var(--color-ash)" }}>
                        <span className="inline-block skew-x-12">{m}</span>
                      </span>
                    ))}
                  </>
                )}
              </span>
            {!readOnly && (
              <span className="relative flex shrink-0 items-center gap-1">
                <IconBtn
                  title={t.lobby.swapTeam}
                  disabled={pending || offline}
                  onClick={() => run({ act: "team", slot: i, team: s.team === "red" ? "blue" : "red" })}
                  style={{ background: s.team === "blue" ? TEAM_C.blue : TEAM_C.red, borderColor: "transparent" }}
                  className="hover:brightness-125"
                >
                  {null}
                </IconBtn>
                {(["swap", "move"] as const).map((mode) => (
                  <IconBtn
                    key={mode}
                    title={mode === "swap" ? t.lobby.swap : t.lobby.move}
                    disabled={pending || offline || !targets(i, mode).length}
                    onClick={() => setPicking(picking?.slot === i && picking.mode === mode ? null : { slot: i, mode })}
                    className={picking?.slot === i && picking.mode === mode ? "border-paper text-paper" : ""}
                  >
                    {mode === "swap" ? <ArrowUpDown className="size-3.5" /> : <MoveVertical className="size-3.5" />}
                  </IconBtn>
                ))}
                <IconBtn title={t.lobby.kick} disabled={pending || offline} onClick={() => window.confirm(t.lobby.confirmKick(s.name)) && run({ act: "kick", slot: i })} className="hover:border-rose hover:text-rose-hi">
                  <UserX className="size-3.5" />
                </IconBtn>
                <AnimatePresence>
                  {picking?.slot === i && (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-20 mt-1.5 flex flex-col items-end gap-1"
                    >
                      {targets(i, picking.mode).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setPicking(null);
                            run({ act: "move", slot: i, to: k });
                          }}
                          className="num inline-flex h-7 min-w-8 max-w-48 -skew-x-12 items-center border border-line bg-ink px-2.5 text-xs font-black text-paper shadow-[3px_3px_0_0_rgba(0,0,0,0.45)] transition-colors hover:border-paper hover:bg-paper hover:text-ink"
                        >
                          <span className="inline-flex min-w-0 skew-x-12 items-center gap-1.5">
                            <span>{k + 1}</span>
                            {all[k] && <span className="truncate">{all[k]!.name}</span>}
                          </span>
                        </button>
                      ))}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            )}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="num w-4 text-[0.7rem] font-black text-ash">{i + 1}</span>
            <span className="flex-1">
              <span className={cn("inline-flex -skew-x-12 border px-1.5 text-[0.6rem] font-black uppercase leading-4 tracking-wide", locked ? "border-dashed border-line text-ash/70" : "border-line/70 text-ash/60")}>
                <span className="inline-flex skew-x-12 items-center gap-1">
                  {locked && <Lock className="size-3" />}
                  {locked ? t.lobby.locked : t.lobby.empty}
                </span>
              </span>
            </span>
            {spareSlot && !readOnly && (
              <IconBtn title={v.spare ? t.lobby.lockSlot : t.lobby.unlockSlot} disabled={pending || offline} onClick={() => run({ act: "spare", open: !v.spare })}>
                {v.spare ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
              </IconBtn>
            )}
          </>
        )}
      </motion.div>
    );
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="@container mb-5 border border-line bg-coal/80 xl:mb-0"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="heading-slam text-lg">{t.lobby.title}</span>
        <span title={t.lobby.bot[v.bot]} className={cn("inline-flex items-center", v.bot === "off" ? "text-rose-hi" : "text-gold")}>
          {v.bot === "online" ? <span className="size-2 rounded-full bg-balkan shadow-[0_0_8px_var(--color-balkan)]" /> : <WifiOff className="size-3.5" />}
        </span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 text-xs font-black text-ash hover:text-paper">
            mp {v.mpId} <ExternalLink className="size-3" />
          </a>
        )}
        {open && v.password && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(v.password).then(() => setCopied(true)).catch(() => {})}
            onMouseLeave={() => setCopied(false)}
            className="num inline-flex items-center gap-1 text-xs font-black text-ash hover:text-paper"
            title={t.lobby.password}
          >
            {t.lobby.password} <span className="text-paper">{v.password}</span> {copied ? <Check className="size-3 text-balkan" /> : <Copy className="size-3" />}
          </button>
        )}
        {open && v.mpId && !readOnly && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(`/join #mp_${v.mpId}`).then(() => setJoinCopied(true)).catch(() => {})}
            onMouseLeave={() => setJoinCopied(false)}
            className="num inline-flex items-center gap-1 text-xs font-black text-ash hover:text-paper"
            title={t.lobby.joinHint}
          >
            {t.lobby.inGame} <span className="text-paper">/join #mp_{v.mpId}</span> {joinCopied ? <Check className="size-3 text-balkan" /> : <Copy className="size-3" />}
          </button>
        )}
        {err && <span className="text-xs font-black text-rose-hi">{t.lobby.failed}</span>}
        {!open && !readOnly && (
          <span className="ml-auto">
            <Btn tone="go" onClick={() => run({ act: "make" })} disabled={pending || v.bot === "off"}>
              <Plus className="size-3.5" strokeWidth={3} /> {v.state === "closed" ? t.lobby.again : t.lobby.make}
            </Btn>
          </span>
        )}
      </div>
      {open && !readOnly && (
        <div className="space-y-2 border-b border-line px-3 py-2.5">
          <div className="grid grid-cols-1">
            <Btn wide onClick={() => setHelp(true)}>
              <CircleHelp className="size-3.5" /> {t.lobby.help}
            </Btn>
          </div>
          <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,1.6fr)] gap-2">
            <Btn wide onClick={() => fill("!mp map ")} disabled={offline}>
              <MapIcon className="size-3.5" /> {t.lobby.map}
            </Btn>
            <Btn wide onClick={() => fill("!mp addref ")} disabled={offline}>
              <UserPlus className="size-3.5" /> {t.lobby.addRef}
            </Btn>
            <Btn wide onClick={() => fill("!mp size ")} disabled={offline}>
              <Users className="size-3.5" /> {t.lobby.size}
            </Btn>
            <Btn wide onClick={() => run({ act: "invite" })} disabled={pending || offline}>
              <Send className="size-3.5" /> {t.lobby.invite}
            </Btn>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Btn wide onClick={() => run({ act: "refresh" })} disabled={pending || offline}>
              <RefreshCw className={cn("size-3.5", pending && "animate-spin")} /> {t.lobby.refresh}
            </Btn>
            <Btn wide onClick={() => fill("!mp timer ")} disabled={offline}>
              <Timer className="size-3.5" /> {t.lobby.timer}
            </Btn>
            <Btn wide onClick={() => run({ act: "aborttimer" })} disabled={pending || offline}>
              <TimerOff className="size-3.5" /> {t.lobby.stopTimer}
            </Btn>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {v.playing ? (
              <Btn wide tone="warn" onClick={() => setAsk("abort")} disabled={pending || offline}>
                <OctagonX className="size-3.5" /> {t.lobby.abort}
              </Btn>
            ) : (
              <Btn wide tone="go" onClick={() => setAsk("start")} disabled={pending || offline || !v.mapId}>
                <Play className="size-3.5 fill-current" /> {t.lobby.start}
              </Btn>
            )}
            <Btn wide tone="bad" onClick={() => setAsk("close")} disabled={pending}>
              <DoorClosed className="size-3.5" /> {t.lobby.close}
            </Btn>
          </div>
        </div>
      )}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {help && <LobbyHelp key="help" onClose={() => setHelp(false)} />}
            {ask && (
              <LobbyAsk
                key={ask}
                kind={ask}
                warn={warn}
                onCancel={() => setAsk(null)}
                onGo={(secs) => {
                  setAsk(null);
                  run(ask === "start" ? { act: "start", secs } : { act: ask });
                }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-px bg-line @4xl:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="grid grid-cols-2 gap-px bg-line">
                <div className="col-span-2 grid grid-flow-col grid-cols-2 gap-px bg-line" style={{ gridTemplateRows: `repeat(${Math.ceil(base / 2)}, auto)` }}>
                  {all.slice(0, base).map((s, i) => slotBox(s, i))}
                </div>
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] bg-coal">
                  <span aria-hidden />
                  {slotBox(all[base], base)}
                  <span aria-hidden />
                </div>
                {all.slice(base + 1).map((s, k) => s && slotBox(s, base + 1 + k))}
              </div>
              <div className="relative flex min-h-24 flex-col justify-center overflow-hidden bg-coal px-4 py-3">
                {map && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={map.cover} alt="" className="absolute inset-0 size-full object-cover opacity-20" />
                )}
                <span className="relative text-[0.65rem] font-black uppercase tracking-widest text-ash">{v.playing ? t.lobby.playing : t.lobby.map}</span>
                {map && (
                  <span className="heading-slam relative text-2xl" style={{ color: slotColor(map.slot) }}>
                    {map.slot}
                  </span>
                )}
                <span className="relative line-clamp-2 break-words text-xs font-bold leading-snug text-paper/80" title={v.mapName ?? undefined}>
                  {v.mapName ?? (map ? `${map.title} [${map.version}]` : v.mapId ? `#${v.mapId}` : t.lobby.noMap)}
                </span>
                <span className="relative mt-1.5 flex flex-wrap gap-1">
                  {(v.freemod ? [...v.mods, "FM"] : v.mods.length ? v.mods : ["NM"]).map((m) => (
                    <span key={m} className="-skew-x-12 border px-1.5 text-[0.7rem] font-black leading-5" style={{ borderColor: MOD_C[m] ?? "var(--color-line)", color: MOD_C[m] ?? "var(--color-ash)" }}>
                      <span className="inline-block skew-x-12">{m}</span>
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <Chat slug={slug} lines={v.chat} sides={new Map(v.slots.flatMap((s) => (s?.team ? [[s.name.toLowerCase().replace(/ /g, "_"), s.team] as const] : [])))} disabled={offline} text={say} setText={setSay} inputRef={sayRef} readOnly={readOnly} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}


function Chat({
  slug,
  lines,
  sides,
  disabled,
  text,
  setText,
  inputRef,
  readOnly,
}: {
  slug: string;
  lines: LobbyView["chat"];
  sides: Map<string, "red" | "blue">;
  disabled: boolean;
  readOnly?: boolean;
  text: string;
  setText: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useDict();
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<boolean | "noslot" | "nouser" | "blocked">(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (until <= now) return;
    const id = setTimeout(() => setNow(Date.now()), 250);
    return () => clearTimeout(id);
  }, [until, now]);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const left = Math.max(0, Math.ceil((until - now) / 1000));
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || left || busy) return;
    setBusy(true);
    setFail(false);
    const sent = text;
    const res = await lobbyPost(slug, { act: readOnly ? "say" : "chat", text: sent });
    setBusy(false);
    if (res?.ok) {
      const t0 = Date.now();
      setNow(t0);
      setUntil(t0 + 1500);
      if (inputRef.current?.value === sent) setText("");
    } else setFail(res?.error === "noslot" || res?.error === "nouser" || res?.error === "blocked" ? res.error : true);
    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-line">
      <div ref={box} className="h-[25rem] overflow-y-auto px-3 py-2 text-[0.95rem]">
        {lines.length ? (
          lines.map((m, i) => {
            const bancho = m.from === "BanchoBot";
            const side = m.side === 1 ? "red" : m.side === 2 ? "blue" : sides.get(m.from.toLowerCase());
            return (
              <p key={`${m.at}-${i}`} className={cn("break-words py-0.5 leading-snug", m.ref && !bancho && "-mx-3 border-l-2 border-balkan bg-balkan/10 px-3")}>
                <span className="num mr-2 text-xs text-ash/70">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className={cn("font-black", bancho ? "text-gold" : m.ref ? "text-balkan" : side === "red" ? "text-rose-hi" : side === "blue" ? "text-azure-hi" : "text-paper")}>{m.from.replace(/_/g, " ")}</span>
                <span className={cn("ml-2", bancho ? "text-paper/70" : "text-paper")}>{m.text}</span>
              </p>
            );
          })
        ) : (
          <p className="py-6 text-center text-xs font-bold uppercase tracking-wide text-ash/60">{t.lobby.quiet}</p>
        )}
      </div>
      {(fail === "noslot" || fail === "nouser" || fail === "blocked") && (
        <p className="border-t border-line bg-rose/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-rose-hi">{fail === "noslot" ? t.lobby.noSlot : fail === "nouser" ? t.lobby.noUser : t.lobby.blocked}</p>
      )}
      <form onSubmit={send} className="flex gap-2 border-t border-line px-3 py-2">
        <span className={cn("flex min-w-0 flex-1 -skew-x-12 border border-line bg-ink focus-within:border-paper", fail && "border-rose focus-within:border-rose")}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (fail) setFail(false);
          }}
          maxLength={300}
          autoComplete="off"
          disabled={disabled}
          placeholder={readOnly ? t.lobby.sayPlayer : t.lobby.say}
          className="adm-bare min-w-0 flex-1 skew-x-12 border-0 bg-transparent px-4 py-2 text-[0.95rem] outline-none"
        />
        </span>
        <button
          type="submit"
          disabled={disabled || busy || !!left || !text.trim()}
          className="inline-flex min-h-8 min-w-20 -skew-x-12 items-center justify-center border border-balkan bg-balkan px-3 text-xs font-black uppercase tracking-wide text-ink transition-colors hover:bg-paper disabled:opacity-50"
        >
          <span className="inline-flex skew-x-12 items-center gap-1.5">{left ? <span className="num">{left}s</span> : <><Send className="size-3.5" /> {t.lobby.send}</>}</span>
        </button>
      </form>
    </div>
  );
}
