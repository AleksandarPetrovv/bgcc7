"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, CircleHelp, DoorClosed, Download, ExternalLink, OctagonX, Play, TriangleAlert, WifiOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { useFormat } from "@/components/site/tournament";
import { Popup, PopupTitle } from "@/components/site/popup";
import { lobbySize } from "@/lib/format";
import { EASE } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";

export async function lobbyPost(slug: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/lobby/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return ((await r?.json().catch(() => null)) ?? null) as { ok: boolean; error?: string } | null;
}

export function IconBtn({ children, className, slant, slantStyle, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { slant?: string; slantStyle?: React.CSSProperties }) {
  return (
    <button type="button" {...p} className={cn("group/ib relative isolate inline-flex h-7 w-8 items-center justify-center text-ash transition-colors hover:text-paper disabled:opacity-40", className)}>
      <SlantBg className={cn("border border-line transition-colors group-hover/ib:border-paper", slant)} style={slantStyle} />
      <span className="inline-flex">{children}</span>
    </button>
  );
}

export function Btn({ onClick, disabled, tone = "line", wide, children }: { onClick: () => void; disabled?: boolean; tone?: "line" | "go" | "warn" | "bad"; wide?: boolean; children: React.ReactNode }) {
  const cls = {
    line: ["text-paper", "border-line group-hover/btn:border-paper"],
    go: ["text-on-fill hover:text-ink", "border-balkan bg-balkan group-hover/btn:border-paper group-hover/btn:bg-paper"],
    warn: ["text-gold-hi", "border-gold group-hover/btn:bg-gold/10"],
    bad: ["text-rose-hi", "border-rose group-hover/btn:bg-rose/10"],
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("group/btn relative isolate inline-flex min-h-8 min-w-0 items-center px-3 text-[0.62rem] font-display font-bold transition-colors disabled:opacity-50 sm:text-xs", wide && "justify-center px-1.5", cls[0])}
    >
      <SlantBg className={cn("border transition-colors", cls[1])} />
      <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap max-sm:[&>svg]:size-3 [&>svg]:shrink-0 sm:gap-1.5">{children}</span>
    </button>
  );
}

export function HelperMissing({ onClose }: { onClose: () => void }) {
  const t = useDict();
  return (
    <Popup onClose={onClose} tone="gold">
      <WifiOff className="size-8 text-gold-hi" />
      <PopupTitle className="heading-slam mt-2 text-3xl">{t.lobby.noHelper}</PopupTitle>
      <p className="mt-1 text-sm font-bold text-paper/70">{t.lobby.noHelperBody}</p>
      <div className="mt-6 flex flex-col gap-2.5">
        <motion.a
          href="/download/helper"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="relative isolate flex min-h-12 items-center px-5 font-display font-bold text-on-fill"
        >
          <SlantBg className="-skew-x-6 bg-gold shadow-[5px_5px_0_0_var(--gold-deep)]" />
          <span className="inline-flex items-center gap-2">
            <Download className="size-4" strokeWidth={3} /> {t.lobby.helperDownload}
          </span>
        </motion.a>
        <motion.a
          href="/admin/helper"
          target="_blank"
          rel="noreferrer"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className="group/hp relative isolate flex min-h-12 items-center px-5 font-display font-bold text-gold-hi"
        >
          <SlantBg className="-skew-x-6 border border-gold group-hover/hp:bg-gold/10" />
          <span className="inline-flex items-center gap-2">
            <ExternalLink className="size-4" /> {t.lobby.helperPage}
          </span>
        </motion.a>
      </div>
    </Popup>
  );
}

export function StreamOrder({ onClose }: { onClose: () => void }) {
  const t = useDict();
  return (
    <Popup onClose={onClose} tone="gold">
      <TriangleAlert className="size-8 text-gold-hi" />
      <PopupTitle className="heading-slam mt-2 text-3xl">{t.lobby.makeFailed}</PopupTitle>
      <p className="mt-1 text-sm font-display font-bold text-gold-hi">{t.lobby.streamTitle}</p>
      <ol className="mt-4 space-y-2.5">
        {t.lobby.streamSteps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="num relative isolate inline-flex size-6 shrink-0 items-center justify-center text-xs font-display font-black text-on-fill">
              <SlantBg className="bg-gold" />
              <span>{i + 1}</span>
            </span>
            <span className="text-sm font-bold leading-relaxed text-paper/85">{s}</span>
          </li>
        ))}
      </ol>
      <motion.button
        type="button"
        onClick={onClose}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.97 }}
        className="relative isolate mt-6 flex min-h-12 w-full items-center px-5 font-display font-bold text-on-fill"
      >
        <SlantBg className="-skew-x-6 bg-gold shadow-[5px_5px_0_0_var(--gold-deep)]" />
        <span className="inline-flex items-center gap-2">
          <Check className="size-4" strokeWidth={3} /> {t.lobby.gotIt}
        </span>
      </motion.button>
    </Popup>
  );
}

const HELP_C: Record<string, string> = {
  map: "var(--azure-hi)",
  addref: "var(--azure-hi)",
  size: "var(--azure-hi)",
  invite: "var(--azure-hi)",
  refresh: "var(--paper)",
  timer: "var(--gold-hi)",
  aborttimer: "var(--gold-hi)",
  start: "var(--balkan-hi)",
  abort: "var(--gold-hi)",
  close: "var(--rose-hi)",
};
const HELP_TONE = { c: "color-mix(in srgb, var(--paper) 80%, transparent)", deep: "color-mix(in srgb, var(--rose-deep) 60%, transparent)" };

export function LobbyHelp({ onClose }: { onClose: () => void }) {
  const t = useDict();
  const size = String(lobbySize(useFormat()));
  const fill = (s: string) => s.replaceAll("%size%", size);
  return (
    <Popup onClose={onClose} tone={HELP_TONE} className="flex max-h-[88dvh] max-w-3xl flex-col overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-line py-4 pl-5 pr-12 sm:pl-6">
        <CircleHelp className="size-7 text-paper" />
        <PopupTitle className="heading-slam text-2xl sm:text-3xl">{t.lobby.helpTitle}</PopupTitle>
      </div>
      <div className="overflow-y-auto px-5 py-5 sm:px-6">
        <div className="mb-5 flex gap-3 border border-gold/60 bg-gold/10 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-gold-hi" />
          <p className="text-sm leading-relaxed text-paper/90">
            <span className="font-display font-bold text-gold-hi">{t.lobby.streamTitle}</span> {t.lobby.streamBody}
          </p>
        </div>
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
                <span className="relative isolate inline-flex px-2.5 py-1 text-xs font-display font-bold" style={{ color: HELP_C[h.id] }}>
                  <SlantBg className="border" style={{ borderColor: HELP_C[h.id] }} />
                  <span>{h.k}</span>
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
        <div className="mt-7 border-t border-line pt-5">
          <div className="text-[0.7rem] font-display font-bold text-ash">{t.lobby.helpExtra}</div>
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
    </Popup>
  );
}

export function LobbyAsk({ kind, warn = [], onCancel, onGo }: { kind: "start" | "abort" | "close"; warn?: string[]; onCancel: () => void; onGo: (secs: number) => void }) {
  const t = useDict();
  const [secs, setSecs] = useState(10);
  const [custom, setCustom] = useState("");
  const tone = { start: { c: "var(--balkan)", deep: "var(--balkan-deep)", hi: "var(--balkan-hi)", Icon: Play }, abort: { c: "var(--gold)", deep: "var(--gold-deep)", hi: "var(--gold-hi)", Icon: OctagonX }, close: { c: "var(--rose)", deep: "var(--rose-deep)", hi: "var(--rose-hi)", Icon: DoorClosed } }[kind];
  const copy = { start: [t.lobby.startTitle, null, t.lobby.start], abort: [t.lobby.abortTitle, t.lobby.abortBody, t.lobby.abort], close: [t.lobby.closeTitle, t.lobby.closeBody, t.lobby.closeYes] }[kind];
  const pickSecs = custom ? Math.min(300, Math.max(0, Math.round(Number(custom)) || 0)) : secs;
  return (
    <Popup onClose={onCancel} tone={tone}>
      <tone.Icon className={cn("size-8", kind === "start" && "fill-current")} style={{ color: tone.hi }} />
      <PopupTitle className="heading-slam mt-2 text-3xl">{copy[0]}</PopupTitle>
      {copy[1] && <p className="mt-1 text-sm font-bold text-paper/70">{copy[1]}</p>}
      {kind === "start" && warn.length > 0 && (
        <div className="mt-4 border border-gold/50 bg-gold/10 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-display font-bold text-gold-hi">
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
          <div className="text-[0.65rem] font-display font-bold text-ash">{t.lobby.startIn}</div>
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
                  "group/sec num relative isolate min-h-9 min-w-12 px-2.5 text-sm font-display font-black transition-colors",
                  !custom && secs === s ? "text-on-fill" : "text-paper",
                )}
              >
                <SlantBg className={cn("border transition-colors", !custom && secs === s ? "border-balkan bg-balkan" : "border-line group-hover/sec:border-paper")} />
                <span className="inline-block">{s ? `${s}s` : t.lobby.now}</span>
              </button>
            ))}
            <span className="group/in relative isolate flex min-h-9 w-20">
              <SlantBg className={cn("border bg-field", custom ? "border-balkan" : "border-line group-focus-within/in:border-paper")} />
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder={t.lobby.secs}
                className="adm-bare num w-full min-w-0 border-0 bg-transparent px-2 text-sm outline-none placeholder:text-ash"
              />
            </span>
          </div>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2.5">
        <motion.button
          type="button"
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onGo(pickSecs)}
          className={cn("relative isolate flex min-h-12 items-center px-5 text-left font-display font-bold", kind === "close" ? "text-white" : "text-paper")}
        >
          <SlantBg className="-skew-x-6" style={{ background: tone.c, boxShadow: `5px 5px 0 0 ${tone.deep}` }} />
          <span className="inline-flex items-center gap-2">
            <tone.Icon className={cn("size-4", kind === "start" && "fill-current")} /> {copy[2]}
            {kind === "start" && <span className="num normal-case">{pickSecs ? `· ${pickSecs}s` : `· ${t.lobby.now}`}</span>}
          </span>
        </motion.button>
        <button type="button" onClick={onCancel} className="mt-1 text-xs font-display font-bold text-ash hover:text-paper">
          {t.draft.cancel}
        </button>
      </div>
    </Popup>
  );
}

