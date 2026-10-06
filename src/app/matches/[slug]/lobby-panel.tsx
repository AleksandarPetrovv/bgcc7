"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, DoorClosed, ExternalLink, Play, Plus, RefreshCw, Send, Square, WifiOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { EASE } from "@/components/site/motion";
import type { Beatmap } from "@/lib/data";
import type { LobbyView } from "@/lib/bancho";
import { slotColor } from "@/lib/format-plan";
import { cn } from "@/lib/utils";
import { abortMp, chatMp, closeMp, inviteMp, makeMpLobby, refreshMp, startMp } from "@/app/admin/draft/lobby-actions";

const TEAM_C = { red: "var(--color-rose)", blue: "var(--color-azure)" } as const;

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

export function LobbyPanel({ slug, matchId, maps, onOpen }: { slug: string; matchId: string; maps: Beatmap[]; onOpen: (open: boolean) => void }) {
  const t = useDict();
  const [v, setV] = useState<LobbyView | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const es = new EventSource(`/api/lobby/${slug}`);
    es.onmessage = (e) => {
      try {
        const next = JSON.parse(e.data) as LobbyView | null;
        if (next) setV(next);
      } catch {}
    };
    return () => es.close();
  }, [slug]);

  const open = v?.state === "open";
  useEffect(() => onOpen(open), [open, onOpen]);

  const run = (fn: () => Promise<{ ok: boolean } | null>) =>
    start(async () => {
      setErr(false);
      const res = await fn().catch(() => null);
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
      className="mb-5 border border-line bg-coal/80"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <span className="heading-slam text-lg">{t.lobby.title}</span>
        <span className={cn("inline-flex items-center gap-1.5 text-[0.7rem] font-black uppercase tracking-wide", v.bot === "online" ? "text-balkan" : v.bot === "off" ? "text-rose-hi" : "text-[#e8c547]")}>
          {v.bot === "online" ? <span className="size-2 rounded-full bg-balkan shadow-[0_0_8px_var(--color-balkan)]" /> : <WifiOff className="size-3.5" />}
          {t.lobby.bot[v.bot]}
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
        {err && <span className="text-xs font-black text-rose-hi">{t.lobby.failed}</span>}
        <span className="ml-auto flex flex-wrap gap-2">
          {open ? (
            <>
              <Btn onClick={() => run(() => inviteMp(matchId))} disabled={pending || offline}>
                <Send className="size-3.5" /> {t.lobby.invite}
              </Btn>
              <Btn onClick={() => run(() => refreshMp(matchId))} disabled={pending || offline}>
                <RefreshCw className={cn("size-3.5", pending && "animate-spin")} /> {t.lobby.refresh}
              </Btn>
              {v.playing ? (
                <Btn tone="warn" onClick={() => run(() => abortMp(matchId))} disabled={pending || offline}>
                  <Square className="size-3.5" /> {t.lobby.abort}
                </Btn>
              ) : (
                <Btn tone="go" onClick={() => run(() => startMp(matchId, 10))} disabled={pending || offline || !v.mapId}>
                  <Play className="size-3.5 fill-current" /> {t.lobby.start}
                </Btn>
              )}
              <Btn tone="bad" onClick={() => window.confirm(t.lobby.confirmClose) && run(() => closeMp(matchId))} disabled={pending}>
                <DoorClosed className="size-3.5" /> {t.lobby.close}
              </Btn>
            </>
          ) : (
            <Btn tone="go" onClick={() => run(() => makeMpLobby(matchId))} disabled={pending || v.bot === "off"}>
              <Plus className="size-3.5" strokeWidth={3} /> {v.state === "closed" ? t.lobby.again : t.lobby.make}
            </Btn>
          )}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-px bg-line sm:grid-cols-[minmax(0,1fr)_16rem]">
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
                        <span className={cn("min-w-0 flex-1 truncate text-sm font-black", !s.side && "text-ash")}>{s.name}</span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 text-[0.65rem] font-black uppercase tracking-wide",
                            s.ready === "ready" ? "text-balkan" : s.ready === "nomap" ? "text-rose-hi" : "text-ash",
                          )}
                        >
                          {s.ready === "ready" && <Check className="size-3.5" strokeWidth={3} />}
                          {t.lobby.ready[s.ready]}
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
                {map ? (
                  <>
                    <span className="heading-slam relative text-2xl" style={{ color: slotColor(map.slot) }}>
                      {map.slot}
                    </span>
                    <span className="relative truncate text-xs font-bold text-paper/80">{map.title}</span>
                  </>
                ) : (
                  <span className="relative text-sm font-bold text-paper/70">{v.mapId ? `#${v.mapId}` : t.lobby.noMap}</span>
                )}
                <span className="relative mt-1 text-[0.7rem] font-black uppercase tracking-wide text-ash">{v.freemod ? `Freemod ${v.mods.join(" ")}` : v.mods.join(" ") || "NM"}</span>
              </div>
            </div>
            <Chat matchId={matchId} lines={v.chat} sides={new Map(v.slots.flatMap((s) => (s?.team ? [[s.name.toLowerCase().replace(/ /g, "_"), s.team] as const] : [])))} disabled={offline} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

const CMDS = ["!mp settings", "!mp start 10", "!mp abort", "!mp timer 120", "!mp aborttimer", "!mp invite ", "!mp move ", "!mp team ", "!mp map ", "!mp mods ", "!mp host ", "!mp clearhost", "!mp lock", "!mp unlock", "!mp size 4", "!mp addref ", "!mp kick ", "!mp close", "!roll"];

function Chat({ matchId, lines, sides, disabled }: { matchId: string; lines: LobbyView["chat"]; sides: Map<string, "red" | "blue">; disabled: boolean }) {
  const t = useDict();
  const [text, setText] = useState("");
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
    const res = await chatMp(matchId, text).catch(() => null);
    setBusy(false);
    const t0 = Date.now();
    setNow(t0);
    setUntil(t0 + 5000);
    if (res?.ok) setText("");
    else setFail(true);
  }

  return (
    <div className="border-t border-line">
      <div ref={box} className="h-52 overflow-y-auto px-3 py-2 text-sm">
        {lines.length ? (
          lines.map((m, i) => {
            const bancho = m.from === "BanchoBot";
            const side = sides.get(m.from.toLowerCase());
            return (
              <p key={`${m.at}-${i}`} className="break-words leading-snug">
                <span className="num mr-2 text-[0.7rem] text-ash/70">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          list="mp-cmds"
          maxLength={300}
          disabled={disabled}
          placeholder={t.lobby.say}
          className={cn("adm-bare min-w-0 flex-1 border border-line bg-ink px-3 py-1.5 text-sm outline-none focus:border-paper", fail && "border-rose")}
        />
        <datalist id="mp-cmds">
          {CMDS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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
