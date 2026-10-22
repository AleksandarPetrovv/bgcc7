"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, CircleHelp, X, DoorClosed, Download, ExternalLink, OctagonX, Play, TriangleAlert, WifiOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { useFormat } from "@/components/site/tournament";
import { lobbySize } from "@/lib/format";
import { EASE } from "@/components/site/motion";
import { cn } from "@/lib/utils";

export const POP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const;

export async function lobbyPost(slug: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/lobby/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return ((await r?.json().catch(() => null)) ?? null) as { ok: boolean; error?: string } | null;
}

export function IconBtn({ children, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...p} className={cn("inline-flex h-7 w-8 -skew-x-12 items-center justify-center border border-line text-ash transition-colors hover:border-paper hover:text-paper disabled:opacity-40", className)}>
      <span className="inline-flex skew-x-12">{children}</span>
    </button>
  );
}

export function Btn({ onClick, disabled, tone = "line", wide, children }: { onClick: () => void; disabled?: boolean; tone?: "line" | "go" | "warn" | "bad"; wide?: boolean; children: React.ReactNode }) {
  const cls = {
    line: "border-line text-paper hover:border-paper",
    go: "border-balkan bg-balkan text-paper hover:bg-paper hover:text-ink hover:border-paper",
    warn: "border-gold text-gold-hi hover:bg-gold/10",
    bad: "border-rose text-rose-hi hover:bg-rose/10",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex min-h-8 min-w-0 -skew-x-12 items-center border px-3 text-xs font-display font-bold transition-colors disabled:opacity-50", wide && "justify-center px-1.5", cls)}
    >
      <span className="inline-flex min-w-0 skew-x-12 items-center gap-1.5 whitespace-nowrap [&>svg]:shrink-0">{children}</span>
    </button>
  );
}

export function HelperMissing({ onClose }: { onClose: () => void }) {
  const t = useDict();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border-2 border-gold bg-coal p-6 shadow-[8px_8px_0_0_var(--gold-deep)]"
        role="dialog"
        aria-modal="true"
      >
        <button type="button" onClick={onClose} aria-label={t.draft.cancel} className="absolute right-3 top-3 p-1 text-ash hover:text-paper">
          <X className="size-4" />
        </button>
        <WifiOff className="size-8 text-gold-hi" />
        <h3 className="heading-slam mt-2 text-3xl">{t.lobby.noHelper}</h3>
        <p className="mt-1 text-sm font-bold text-paper/70">{t.lobby.noHelperBody}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <motion.a
            href="/download/helper"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            className="flex min-h-12 -skew-x-6 items-center bg-gold px-5 font-display font-bold text-paper shadow-[5px_5px_0_0_var(--gold-deep)]"
          >
            <span className="inline-flex skew-x-6 items-center gap-2">
              <Download className="size-4" strokeWidth={3} /> {t.lobby.helperDownload}
            </span>
          </motion.a>
          <motion.a
            href="/admin/refapp"
            target="_blank"
            rel="noreferrer"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            className="flex min-h-12 -skew-x-6 items-center border border-gold px-5 font-display font-bold text-gold-hi hover:bg-gold/10"
          >
            <span className="inline-flex skew-x-6 items-center gap-2">
              <ExternalLink className="size-4" /> {t.lobby.helperPage}
            </span>
          </motion.a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function StreamOrder({ onClose }: { onClose: () => void }) {
  const t = useDict();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden border-2 border-gold bg-coal p-6 shadow-[8px_8px_0_0_var(--gold-deep)]"
        role="dialog"
        aria-modal="true"
      >
        <button type="button" onClick={onClose} aria-label={t.draft.cancel} className="absolute right-3 top-3 p-1 text-ash hover:text-paper">
          <X className="size-4" />
        </button>
        <TriangleAlert className="size-8 text-gold-hi" />
        <h3 className="heading-slam mt-2 text-3xl">{t.lobby.makeFailed}</h3>
        <p className="mt-1 text-sm font-display font-bold text-gold-hi">{t.lobby.streamTitle}</p>
        <ol className="mt-4 space-y-2.5">
          {t.lobby.streamSteps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="num inline-flex size-6 shrink-0 -skew-x-12 items-center justify-center bg-gold text-xs font-display font-black text-paper">
                <span className="skew-x-12">{i + 1}</span>
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
          className="mt-6 flex min-h-12 w-full -skew-x-6 items-center bg-gold px-5 font-display font-bold text-paper shadow-[5px_5px_0_0_var(--gold-deep)]"
        >
          <span className="inline-flex skew-x-6 items-center gap-2">
            <Check className="size-4" strokeWidth={3} /> {t.lobby.gotIt}
          </span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

const HELP_C = ["var(--azure-hi)", "var(--azure-hi)", "var(--azure-hi)", "var(--azure-hi)", "var(--paper)", "var(--gold-hi)", "var(--gold-hi)", "var(--balkan-hi)", "var(--gold-hi)", "var(--rose-hi)"];

export function LobbyHelp({ onClose }: { onClose: () => void }) {
  const t = useDict();
  const size = String(lobbySize(useFormat()));
  const fill = (s: string) => s.replaceAll("%size%", size);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={POP.initial}
        animate={POP.animate}
        exit={POP.exit}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden border-2 border-paper/80 bg-coal shadow-[8px_8px_0_0_color-mix(in_srgb,var(--rose-deep)_60%,transparent)]"
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
                  <span className="inline-flex -skew-x-12 border px-2.5 py-1 text-xs font-display font-bold" style={{ borderColor: HELP_C[i], color: HELP_C[i] }}>
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
      </motion.div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
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
        <tone.Icon className={cn("size-8", kind === "start" && "fill-current")} style={{ color: tone.hi }} />
        <h3 className="heading-slam mt-2 text-3xl">{copy[0]}</h3>
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
                    "num min-h-9 min-w-12 -skew-x-12 border px-2.5 text-sm font-display font-black transition-colors",
                    !custom && secs === s ? "border-balkan bg-balkan text-paper" : "border-line text-paper hover:border-paper",
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
                className={cn("adm-bare num min-h-9 w-20 border bg-field px-2 text-sm outline-none placeholder:text-ash", custom ? "border-balkan" : "border-line focus:border-paper")}
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
            className={cn("flex min-h-12 -skew-x-6 items-center px-5 text-left font-display font-bold", kind === "close" ? "text-white" : "text-paper")}
            style={{ background: tone.c, boxShadow: `5px 5px 0 0 ${tone.deep}` }}
          >
            <span className="inline-flex skew-x-6 items-center gap-2">
              <tone.Icon className={cn("size-4", kind === "start" && "fill-current")} /> {copy[2]}
              {kind === "start" && <span className="num normal-case">{pickSecs ? `· ${pickSecs}s` : `· ${t.lobby.now}`}</span>}
            </span>
          </motion.button>
          <button type="button" onClick={onCancel} className="mt-1 text-xs font-display font-bold text-ash hover:text-paper">
            {t.draft.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

