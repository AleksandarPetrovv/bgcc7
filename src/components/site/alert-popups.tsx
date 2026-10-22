"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, X } from "lucide-react";
import { retryFinish } from "@/app/(site)/admin/alerts/actions";
import { ALERT_KINDS, snoozeMs, type Alert } from "@/lib/alert-types";
import { cn } from "@/lib/utils";
import { useDict } from "./lang";

const KEY = "bgcc-alert-snooze";
type Snoozes = Record<string, number>;

function readSnoozes(raw: string | null): Snoozes {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, until]) => typeof until === "number" && Number.isFinite(until) && until > Date.now()));
  } catch {
    return {};
  }
}

function writeSnoozes(value: Snoozes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {}
}

function currentSnoozes(value: Snoozes, alerts: Alert[]): Snoozes {
  const ids = new Set(alerts.map((a) => a.id));
  const now = Date.now();
  return Object.fromEntries(Object.entries(value).filter(([id, until]) => ids.has(id) && until > now));
}

function isAlert(value: unknown): value is Alert {
  if (!value || typeof value !== "object") return false;
  const a = value as Alert;
  return typeof a.id === "string" && ALERT_KINDS.includes(a.kind) && (a.level === "red" || a.level === "gold") && typeof a.since === "number" && Number.isFinite(a.since);
}

function AlertCard({ alert, onSnooze }: { alert: Alert; onSnooze: (alert: Alert) => void }) {
  const t = useDict().alerts;
  const text = t[alert.kind];
  const titleId = useId();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const red = alert.level === "red";
  const button = cn("inline-flex min-h-10 -skew-x-12 items-center justify-center gap-2 px-4 py-2 text-sm font-display font-black text-paper transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper disabled:opacity-60", red ? "bg-rose text-white hover:bg-paper hover:text-ink" : "bg-gold hover:bg-paper hover:text-ink");

  const retry = () => {
    if (!alert.match || pending) return;
    const id = alert.match.id;
    setFailed(false);
    start(async () => {
      try {
        const result = await retryFinish(id);
        setFailed(!result?.ok);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <article
      aria-labelledby={titleId}
      className={cn("relative shrink-0 border-2 bg-coal p-5 shadow-[6px_6px_0_0_var(--alert-shadow)]", red ? "border-rose [--alert-shadow:var(--rose-deep)]" : "border-gold [--alert-shadow:var(--gold-deep)]")}
    >
      <button type="button" onClick={() => onSnooze(alert)} aria-label={t.snooze(red ? 10 : 30)} title={t.snooze(red ? 10 : 30)} className="absolute right-1 top-1 grid size-10 place-items-center text-ash transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper">
        <X className="size-4" aria-hidden />
      </button>
      <h2 id={titleId} className={cn("heading-slam pr-7 text-xl leading-tight", red ? "text-rose-hi" : "text-gold-hi")}>{text.title}</h2>
      {alert.match && <p className="mt-2 break-words text-sm font-display font-black text-paper">{alert.match.label}</p>}
      <p className="mt-3 text-sm leading-relaxed text-paper/85">{text.means}</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-paper/85 marker:font-black marker:text-paper">
        {text.steps.map((step) => <li key={step} className="pl-1">{step}</li>)}
      </ol>
      {alert.kind === "bracketBlocked" && !!alert.blocked?.length && (
        <ul className="mt-3 space-y-1 border-y border-line py-3 text-sm font-bold text-paper">
          {alert.blocked.map((label, i) => <li key={`${i}:${label}`} className="break-words">{label}</li>)}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 px-1">
        {alert.kind === "finishFailed" ? (
          <>
            <button type="button" onClick={retry} disabled={pending || !alert.match} className={button} aria-busy={pending}>
              <span className="inline-flex skew-x-12 items-center gap-2">{pending && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />}{pending ? t.retrying : t.retry}</span>
            </button>
            {alert.href && <Link href={alert.href} className="min-h-10 content-center text-sm font-display font-bold text-paper underline decoration-ash underline-offset-4 hover:decoration-paper focus-visible:outline-2 focus-visible:outline-paper">{t.openMatchAdmin}</Link>}
          </>
        ) : alert.href && <Link href={alert.href} className={button}><span className="skew-x-12">{text.button}</span></Link>}
      </div>
      {failed && <p role="alert" className="mt-3 text-sm font-bold text-rose-hi">{t.retryFailed}</p>}
      {alert.detail && (
        <details className="mt-3 border-t border-line pt-2">
          <summary className="w-fit cursor-pointer py-1 text-xs font-display font-bold text-ash hover:text-paper focus-visible:outline-2 focus-visible:outline-paper">{t.details}</summary>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-paper/75">{alert.detail}</pre>
        </details>
      )}
    </article>
  );
}

export function AlertPopups() {
  const t = useDict().alerts;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [snoozes, setSnoozes] = useState<Snoozes>({});
  const [expanded, setExpanded] = useState(false);
  const latest = useRef<Alert[]>([]);
  const snoozed = useRef<Snoozes>({});

  useEffect(() => {
    try {
      snoozed.current = readSnoozes(localStorage.getItem(KEY));
    } catch {}
    let received = false;
    const source = new EventSource("/api/alerts");
    source.onmessage = (event) => {
      let value: unknown;
      try {
        value = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!Array.isArray(value)) return;
      const next = value.filter(isAlert);
      received = true;
      latest.current = next;
      snoozed.current = currentSnoozes(snoozed.current, next);
      writeSnoozes(snoozed.current);
      setSnoozes(snoozed.current);
      setAlerts(next);
    };
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== KEY && event.key !== null)) return;
      const value = readSnoozes(event.newValue);
      snoozed.current = received ? currentSnoozes(value, latest.current) : value;
      setSnoozes(snoozed.current);
    };
    window.addEventListener("storage", sync);
    return () => {
      source.close();
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const until = Math.min(...Object.values(snoozes));
    if (!Number.isFinite(until)) return;
    const timer = setTimeout(() => {
      snoozed.current = currentSnoozes(snoozed.current, latest.current);
      writeSnoozes(snoozed.current);
      setSnoozes(snoozed.current);
    }, Math.max(0, until - Date.now()));
    return () => clearTimeout(timer);
  }, [snoozes]);

  const snooze = (alert: Alert) => {
    const next = { ...snoozed.current, [alert.id]: Date.now() + snoozeMs(alert) };
    snoozed.current = next;
    writeSnoozes(next);
    setSnoozes(next);
  };

  const visible = alerts.filter((a) => !snoozes[a.id]).sort((a, b) => b.since - a.since);
  if (!visible.length) return null;

  return (
    <aside aria-label={t.label} aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[90] sm:left-auto sm:right-6 sm:w-[26rem]">
      <div className="pointer-events-auto flex max-h-[calc(100dvh-6rem)] flex-col gap-3 overflow-y-auto overscroll-contain p-2 [scrollbar-color:var(--ash)_var(--coal)]">
        {(expanded ? visible : visible.slice(0, 3)).map((alert) => <AlertCard key={alert.id} alert={alert} onSnooze={snooze} />)}
        {visible.length > 3 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="min-h-10 shrink-0 border border-line bg-coal px-3 text-sm font-display font-bold text-paper hover:border-gold focus-visible:outline-2 focus-visible:outline-paper">{expanded ? t.less : t.more(visible.length - 3)}</button>}
      </div>
    </aside>
  );
}
