"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpDown, Check, Copy, DoorClosed, ExternalLink, Lock, LockOpen, Map as MapIcon, MoveVertical, OctagonX, Play, Plus, RefreshCw, Send, Timer, TimerOff, UserPlus, UserX, Users, WifiOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { useSSE } from "@/components/site/use-sse";
import { useFormat } from "@/components/site/tournament";
import { lobbySize } from "@/lib/format";
import { EASE } from "@/components/site/motion";
import type { Beatmap } from "@/lib/data";
import type { LobbyView } from "@/lib/bancho";
import { slotColor } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { LOBBY_TEAM, MOD_COLOR, modHi, TEAM } from "@/lib/theme";
import { osuMp } from "@/lib/links";
import { Btn, HelperMissing, IconBtn, LobbyAsk, StreamOrder, lobbyPost } from "./lobby-popups";
import { Chat } from "./lobby-chat";

const TEAM_C = LOBBY_TEAM;
const TEAM_HI = { red: TEAM[1].hi, blue: TEAM[2].hi } as const;
const modC = (m: string) => modHi(MOD_COLOR[m]) ?? "var(--ash)";

export function LobbyPanel({ slug, maps, onOpen, readOnly: viewOnly, streams = false, canSay, teamNames }: { slug: string; maps: Beatmap[]; onOpen: (open: boolean) => void; readOnly?: boolean; streams?: boolean; canSay: boolean; teamNames: [string, string] }) {
  const t = useDict();
  const format = useFormat();
  const [v, setV] = useState<LobbyView | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinCopied, setJoinCopied] = useState(false);
  const [picking, setPicking] = useState<{ slot: number; mode: "swap" | "move" } | null>(null);
  const [ask, setAsk] = useState<"start" | "abort" | "close" | null>(null);
  const [noHelper, setNoHelper] = useState(false);
  const [order, setOrder] = useState(false);
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
      if (!res?.ok) {
        setErr(true);
        if (body.act === "make" && streams) setOrder(true);
      }
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
  const wantOf = (s: NonNullable<LobbyView["slots"][number]>) => (s.side === 1 ? "red" : s.side === 2 ? "blue" : null);
  const wrong = all.flatMap((s, i) => (s && wantOf(s) && s.team !== wantOf(s) ? [{ slot: i, team: wantOf(s)! }] : []));
  const fixAll = () =>
    start(async () => {
      setErr(false);
      for (const [i, w] of wrong.entries()) {
        if (i > 0) await new Promise((r) => setTimeout(r, 1000));
        const res = await lobbyPost(slug, { act: "team", slot: w.slot, team: w.team });
        if (!res?.ok) setErr(true);
      }
    });
  const sideCol = (side: 1 | 2) => {
    const want = side === 1 ? "red" : "blue";
    const people = all.flatMap((s, i) => (s && s.side === side ? [{ s, i }] : []));
    return (
      <div className="min-w-0 bg-coal">
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5" style={{ boxShadow: `inset 0 2px 0 ${TEAM_C[want]}` }}>
          <span className="text-[0.62rem] font-display font-bold" style={{ color: TEAM_HI[want] }}>
            {t.lobby.side[want]}
          </span>
          <span className="min-w-0 truncate text-xs font-display font-black text-paper">{teamNames[side - 1]}</span>
        </div>
        <ul className="divide-y divide-line">
          {people.map(({ s, i }) => {
            const ok = s.team === want;
            return (
              <li key={s.name} className={cn("flex min-h-10 items-center gap-2 px-3 py-1.5", !ok && "shadow-[inset_3px_0_0_var(--gold-deep)] bg-gold/15")}>
                <span className="min-w-0 flex-1 truncate text-sm font-display font-black">{s.name}</span>
                {ok ? (
                  <span className="inline-flex items-center gap-1 text-[0.6rem] font-display font-bold text-ash">
                    <span className="size-1.5 rotate-45" style={{ background: TEAM_C[want] }} aria-hidden />
                    {t.lobby.side[want]}
                  </span>
                ) : (
                  <>
                    <span className="text-[0.62rem] font-display font-bold text-gold-hi">{t.lobby.onWrong(s.team ? t.lobby.side[s.team] : "–", t.lobby.side[want])}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        disabled={pending || offline}
                        onClick={() => run({ act: "team", slot: i, team: want })}
                        className="inline-flex h-7 -skew-x-12 items-center border px-2 text-[0.62rem] font-display font-bold text-white transition-[filter] hover:brightness-125 disabled:opacity-50"
                        style={{ background: TEAM_C[want], borderColor: TEAM_C[want] }}
                      >
                        <span className="skew-x-12">{t.lobby.moveTo(t.lobby.side[want])}</span>
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {people.length === 0 && <li className="px-3 py-2 text-xs font-display font-bold text-ash">{t.lobby.noneHere}</li>}
        </ul>
      </div>
    );
  };
  const strangers = all.filter((s): s is NonNullable<typeof s> => !!s && s.side === null);
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
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: s.team ? TEAM_C[s.team] : "var(--line)" }} />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="num w-4 shrink-0 text-[0.7rem] font-display font-black text-ash">{i + 1}</span>
                <span className={cn("min-w-0 truncate text-sm font-display font-black", s.team === "red" ? "text-crimson-hi" : s.team === "blue" ? "text-azure-hi" : "text-ash")}>{s.name}</span>
              </span>
              <span className="flex flex-col items-start gap-1.5 pl-6">
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                <span
                  className={cn(
                    "inline-flex -skew-x-12 items-center whitespace-nowrap border px-1.5 text-[0.6rem] font-display font-bold leading-4",
                    s.ready === "ready" ? "border-balkan bg-balkan text-on-fill" : s.ready === "nomap" ? "border-rose text-rose-hi" : "border-line text-ash",
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
                      <span title={t.lobby.noNf} className="-skew-x-12 border border-paper/40 px-1.5 text-[0.6rem] font-display font-black leading-4 text-paper/50">
                        <span className="inline-block skew-x-12 line-through decoration-rose-hi decoration-2">NF</span>
                      </span>
                    )}
                    {s.mods.map((m) => (
                      <span key={m} className="-skew-x-12 border px-1.5 text-[0.6rem] font-display font-black leading-4" style={{ borderColor: modC(m), color: modC(m) }}>
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
                          className="num inline-flex h-7 min-w-8 max-w-48 -skew-x-12 items-center border border-line bg-ink px-2.5 text-xs font-display font-black text-paper shadow-[3px_3px_0_0_color-mix(in_srgb,var(--rose-deep)_45%,transparent)] transition-colors hover:border-paper hover:bg-paper hover:text-ink"
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
            <span className="num w-4 text-[0.7rem] font-display font-black text-ash">{i + 1}</span>
            <span className="flex-1">
              <span className={cn("inline-flex -skew-x-12 border px-1.5 text-[0.6rem] font-display font-bold leading-4", locked ? "border-dashed border-line text-ash/70" : "border-line/70 text-ash/60")}>
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
        <span title={t.lobby.bot[v.bot]} className={cn("inline-flex items-center", v.bot === "off" ? "text-rose-hi" : "text-gold-hi")}>
          {v.bot === "online" ? <span className="size-2 rounded-full bg-balkan-deep shadow-[0_0_8px_var(--balkan)]" /> : <WifiOff className="size-3.5" />}
        </span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 text-xs font-display font-black text-ash hover:text-paper">
            mp {v.mpId} <ExternalLink className="size-3" />
          </a>
        )}
        {open && v.password && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(v.password).then(() => setCopied(true)).catch(() => {})}
            onMouseLeave={() => setCopied(false)}
            className="num inline-flex items-center gap-1 text-xs font-display font-black text-ash hover:text-paper"
            title={t.lobby.password}
          >
            {t.lobby.password} <span className="text-paper">{v.password}</span> {copied ? <Check className="size-3 text-balkan-hi" /> : <Copy className="size-3" />}
          </button>
        )}
        {open && v.mpId && !readOnly && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(`/join #mp_${v.mpId}`).then(() => setJoinCopied(true)).catch(() => {})}
            onMouseLeave={() => setJoinCopied(false)}
            className="num inline-flex items-center gap-1 text-xs font-display font-black text-ash hover:text-paper"
            title={t.lobby.joinHint}
          >
            {t.lobby.inGame} <span className="text-paper">/join #mp_{v.mpId}</span> {joinCopied ? <Check className="size-3 text-balkan-hi" /> : <Copy className="size-3" />}
          </button>
        )}
        {err && <span className="text-xs font-black text-rose-hi">{t.lobby.failed}</span>}
        {!open && !readOnly && (
          <span className="ml-auto">
            <Btn tone="go" onClick={() => (v.helper === false ? setNoHelper(true) : run({ act: "make" }))} disabled={pending}>
              <Plus className="size-3.5" strokeWidth={3} /> {v.state === "closed" ? t.lobby.again : t.lobby.make}
            </Btn>
          </span>
        )}
      </div>
      {open && !readOnly && (
        <div className="space-y-2 border-b border-line px-3 py-2.5">
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
            {noHelper && <HelperMissing key="helper" onClose={() => setNoHelper(false)} />}
            {order && <StreamOrder key="order" onClose={() => setOrder(false)} />}
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
            {wrong.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-gold/50 bg-gold/10 px-3 py-2">
                <span className="text-xs font-display font-bold text-gold-hi">{t.lobby.wrongSides(wrong.length)}</span>
                {!readOnly && (
                  <button
                    type="button"
                    disabled={pending || offline}
                    onClick={fixAll}
                    className="ml-auto inline-flex h-8 -skew-x-12 items-center border border-gold bg-gold px-3 text-xs font-display font-bold text-on-fill transition-colors hover:bg-paper hover:text-ink disabled:opacity-50"
                  >
                    <span className="skew-x-12">{t.lobby.fixAll}</span>
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-px border-b border-line bg-line">
              {sideCol(1)}
              {sideCol(2)}
              {strangers.length > 0 && (
                <div className="col-span-2 flex flex-wrap items-center gap-2 bg-coal px-3 py-1.5">
                  <span className="text-[0.62rem] font-display font-bold text-rose-hi">{t.lobby.notInMatch}</span>
                  {strangers.map((s) => (
                    <span key={s.name} className="text-xs font-display font-black text-paper/80">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
                <span className="relative text-[0.65rem] font-display font-bold text-ash">{v.playing ? t.lobby.playing : t.lobby.map}</span>
                {map && (
                  <span className="heading-slam relative text-2xl" style={{ color: modHi(slotColor(map.slot)) }}>
                    {map.slot}
                  </span>
                )}
                <span className="relative line-clamp-2 break-words text-xs font-display font-bold leading-snug text-paper/80" title={v.mapName ?? undefined}>
                  {v.mapName ?? (map ? `${map.title} [${map.version}]` : v.mapId ? `#${v.mapId}` : t.lobby.noMap)}
                </span>
                <span className="relative mt-1.5 flex flex-wrap gap-1">
                  {(v.freemod ? [...v.mods, "FM"] : v.mods.length ? v.mods : ["NM"]).map((m) => (
                    <span key={m} className="-skew-x-12 border px-1.5 text-[0.7rem] font-display font-black leading-5" style={{ borderColor: modC(m), color: modC(m) }}>
                      <span className="inline-block skew-x-12">{m}</span>
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <Chat slug={slug} mpId={v.mpId} lines={v.chat} sides={new Map(v.slots.flatMap((s) => (s?.team ? [[s.name.toLowerCase().replace(/ /g, "_"), s.team] as const] : [])))} disabled={offline} text={say} setText={setSay} inputRef={sayRef} readOnly={readOnly} canSay={canSay} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
