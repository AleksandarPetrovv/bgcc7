"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight, Check, Copy, Crown, DoorClosed, ExternalLink, Map as MapIcon, MoveVertical, Play, Plus, RefreshCw, Send, Square, Timer, TimerOff, UserPlus, UserX, Users, WifiOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { useSSE } from "@/components/site/use-sse";
import { EASE } from "@/components/site/motion";
import type { Beatmap } from "@/lib/data";
import type { LobbyView } from "@/lib/bancho";
import { slotColor } from "@/lib/format-plan";
import { cn } from "@/lib/utils";

const TEAM_C = { red: "var(--color-rose)", blue: "var(--color-azure)" } as const;
const MOD_C: Record<string, string> = { NM: "var(--color-mod-nm)", HD: "var(--color-mod-hd)", HR: "var(--color-mod-hr)", DT: "var(--color-mod-dt)", NC: "var(--color-mod-dt)", FM: "var(--color-mod-fm)", NF: "var(--color-paper)" };

export async function lobbyPost(slug: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/lobby/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return ((await r?.json().catch(() => null)) ?? null) as { ok: boolean; error?: string } | null;
}

function IconBtn({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className={cn("inline-flex size-7 items-center justify-center border border-line text-ash transition-colors hover:border-paper hover:text-paper disabled:opacity-40", className)}>
      {children}
    </button>
  );
}

function Btn({ onClick, disabled, tone = "line", children }: { onClick: () => void; disabled?: boolean; tone?: "line" | "go" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = {
    line: "border-line text-paper hover:border-paper",
    go: "border-balkan bg-balkan text-ink hover:bg-paper hover:border-paper",
    warn: "border-[#e8c547] text-[#e8c547] hover:bg-[#e8c547]/10",
    bad: "border-rose text-rose-hi hover:bg-rose/10",
  }[tone];
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("inline-flex min-h-8 -skew-x-12 items-center border px-3 text-xs font-black uppercase tracking-wide transition-colors disabled:opacity-50", cls)}>
      <span className="inline-flex skew-x-12 items-center gap-1.5">{children}</span>
    </button>
  );
}

export function LobbyPanel({ slug, maps, onOpen }: { slug: string; maps: Beatmap[]; onOpen: (open: boolean) => void }) {
  const t = useDict();
  const [v, setV] = useState<LobbyView | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinCopied, setJoinCopied] = useState(false);
  const [moving, setMoving] = useState<number | null>(null);
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
  useEffect(() => onOpen(open), [open, onOpen]);

  const run = (body: Record<string, unknown>) =>
    start(async () => {
      setErr(false);
      const res = await lobbyPost(slug, body);
      if (!res?.ok) setErr(true);
    });

  if (!v) return null;
  const map = v.mapId ? maps.find((m) => m.id === v.mapId) : undefined;
  const offline = v.bot !== "online";
  const link = v.mpId ? `https://osu.ppy.sh/mp/${v.mpId}` : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="@container mb-5 border border-line bg-coal/80 xl:mb-0"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="heading-slam text-lg">{t.lobby.title}</span>
        <span title={t.lobby.bot[v.bot]} className={cn("inline-flex items-center", v.bot === "off" ? "text-rose-hi" : "text-[#e8c547]")}>
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
        {open && v.mpId && (
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
        <span className="ml-auto flex flex-wrap gap-2">
          {open ? (
            <>
              <Btn onClick={() => fill("!mp map ")} disabled={offline}>
                <MapIcon className="size-3.5" /> {t.lobby.map}
              </Btn>
              <Btn onClick={() => fill("!mp addref ")} disabled={offline}>
                <UserPlus className="size-3.5" /> {t.lobby.addRef}
              </Btn>
              <Btn onClick={() => fill("!mp size ")} disabled={offline}>
                <Users className="size-3.5" /> {t.lobby.size}
              </Btn>
              <Btn onClick={() => run({ act: "invite" })} disabled={pending || offline}>
                <Send className="size-3.5" /> {t.lobby.invite}
              </Btn>
              <Btn onClick={() => run({ act: "refresh" })} disabled={pending || offline}>
                <RefreshCw className={cn("size-3.5", pending && "animate-spin")} /> {t.lobby.refresh}
              </Btn>
              <Btn onClick={() => fill("!mp timer ")} disabled={offline}>
                <Timer className="size-3.5" /> {t.lobby.timer}
              </Btn>
              <Btn onClick={() => run({ act: "aborttimer" })} disabled={pending || offline}>
                <TimerOff className="size-3.5" /> {t.lobby.stopTimer}
              </Btn>
              {v.playing ? (
                <Btn tone="warn" onClick={() => run({ act: "abort" })} disabled={pending || offline}>
                  <Square className="size-3.5" /> {t.lobby.abort}
                </Btn>
              ) : (
                <Btn tone="go" onClick={() => run({ act: "start" })} disabled={pending || offline || !v.mapId}>
                  <Play className="size-3.5 fill-current" /> {t.lobby.start}
                </Btn>
              )}
              <Btn tone="bad" onClick={() => window.confirm(t.lobby.confirmClose) && run({ act: "close" })} disabled={pending}>
                <DoorClosed className="size-3.5" /> {t.lobby.close}
              </Btn>
            </>
          ) : (
            <Btn tone="go" onClick={() => run({ act: "make" })} disabled={pending || v.bot === "off"}>
              <Plus className="size-3.5" strokeWidth={3} /> {v.state === "closed" ? t.lobby.again : t.lobby.make}
            </Btn>
          )}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-px bg-line @4xl:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="grid grid-cols-2 gap-px bg-line">
                {(v.slots.length ? v.slots : Array.from({ length: v.size || 4 }, () => null)).map((s, i) => (
                  <motion.div
                    key={s ? `${i}-${s.name}` : `e${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
                    className="relative flex min-h-12 items-center gap-2 bg-coal px-3 py-2"
                  >
                    {s ? (
                      <>
                        <span className="absolute inset-y-0 left-0 w-1" style={{ background: s.team ? TEAM_C[s.team] : "var(--color-line)" }} />
                        <span className="num w-4 text-[0.7rem] font-black text-ash">{i + 1}</span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={cn("truncate text-sm font-black", s.team === "red" ? "text-rose-hi" : s.team === "blue" ? "text-azure-hi" : "text-ash")}>{s.name}</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-wide",
                              s.ready === "ready" ? "text-balkan" : s.ready === "nomap" ? "text-rose-hi" : "text-ash",
                            )}
                          >
                            {s.ready === "ready" && <Check className="size-3" strokeWidth={3} />}
                            {t.lobby.ready[s.ready]}
                          </span>
                        </span>
                        <span className="relative flex shrink-0 items-center gap-1">
                          <IconBtn
                            title={t.lobby.swapTeam}
                            disabled={pending || offline}
                            onClick={() => run({ act: "team", slot: i, team: s.team === "red" ? "blue" : "red" })}
                            style={{ background: s.team === "red" ? TEAM_C.blue : TEAM_C.red }}
                            className="text-white"
                          >
                            <ArrowLeftRight className="size-3.5" />
                          </IconBtn>
                          <IconBtn title={t.lobby.host} disabled={pending || offline} onClick={() => run({ act: "host", slot: i })} className={s.host ? "border-[#e8c547] text-[#e8c547]" : ""}>
                            <Crown className="size-3.5" />
                          </IconBtn>
                          <IconBtn title={t.lobby.move} disabled={pending || offline} onClick={() => setMoving(moving === i ? null : i)} className={moving === i ? "border-paper text-paper" : ""}>
                            <MoveVertical className="size-3.5" />
                          </IconBtn>
                          <IconBtn title={t.lobby.kick} disabled={pending || offline} onClick={() => window.confirm(t.lobby.confirmKick(s.name)) && run({ act: "kick", slot: i })} className="hover:border-rose hover:text-rose-hi">
                            <UserX className="size-3.5" />
                          </IconBtn>
                          <AnimatePresence>
                            {moving === i && (
                              <motion.span
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full z-20 mt-1 flex gap-1 border border-line bg-ink p-1 shadow-[4px_4px_0_0_rgba(0,0,0,0.4)]"
                              >
                                {Array.from({ length: v.size || 4 }, (_, k) => k)
                                  .filter((k) => k !== i)
                                  .map((k) => (
                                    <button
                                      key={k}
                                      type="button"
                                      onClick={() => {
                                        setMoving(null);
                                        run({ act: "move", slot: i, to: k });
                                      }}
                                      className="num size-7 border border-line text-xs font-black text-paper transition-colors hover:border-paper hover:bg-paper hover:text-ink"
                                    >
                                      {k + 1}
                                    </button>
                                  ))}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="num w-4 text-[0.7rem] font-black text-ash">{i + 1}</span>
                        <span className="text-xs font-bold uppercase tracking-wide text-ash/60">{t.lobby.empty}</span>
                      </>
                    )}
                  </motion.div>
                ))}
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
                  {(v.freemod ? ["FM", ...v.mods] : v.mods.length ? v.mods : ["NM"]).map((m) => (
                    <span key={m} className="-skew-x-12 border px-1.5 text-[0.7rem] font-black leading-5" style={{ borderColor: MOD_C[m] ?? "var(--color-line)", color: MOD_C[m] ?? "var(--color-ash)" }}>
                      <span className="inline-block skew-x-12">{m}</span>
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <Chat slug={slug} lines={v.chat} sides={new Map(v.slots.flatMap((s) => (s?.team ? [[s.name.toLowerCase().replace(/ /g, "_"), s.team] as const] : [])))} disabled={offline} text={say} setText={setSay} inputRef={sayRef} />
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
}: {
  slug: string;
  lines: LobbyView["chat"];
  sides: Map<string, "red" | "blue">;
  disabled: boolean;
  text: string;
  setText: (s: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = useDict();
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
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
    const res = await lobbyPost(slug, { act: "chat", text: sent });
    setBusy(false);
    if (res?.ok) {
      const t0 = Date.now();
      setNow(t0);
      setUntil(t0 + 1500);
      if (inputRef.current?.value === sent) setText("");
    } else setFail(true);
    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-line">
      <div ref={box} className="h-72 overflow-y-auto px-3 py-2 text-[0.95rem]">
        {lines.length ? (
          lines.map((m, i) => {
            const bancho = m.from === "BanchoBot";
            const side = sides.get(m.from.toLowerCase());
            return (
              <p key={`${m.at}-${i}`} className="break-words py-0.5 leading-snug">
                <span className="num mr-2 text-xs text-ash/70">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className={cn("font-black", bancho ? "text-[#e8c547]" : side === "red" ? "text-rose-hi" : side === "blue" ? "text-azure-hi" : "text-paper")}>{m.from.replace(/_/g, " ")}</span>
                <span className={cn("ml-2", bancho ? "text-paper/70" : "text-paper")}>{m.text}</span>
              </p>
            );
          })
        ) : (
          <p className="py-6 text-center text-xs font-bold uppercase tracking-wide text-ash/60">{t.lobby.quiet}</p>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          autoComplete="off"
          disabled={disabled}
          placeholder={t.lobby.say}
          className={cn("adm-bare min-w-0 flex-1 border border-line bg-ink px-3 py-2 text-[0.95rem] outline-none focus:border-paper", fail && "border-rose")}
        />
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
