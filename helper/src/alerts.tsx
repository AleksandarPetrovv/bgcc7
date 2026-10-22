import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ALERT_TEXT } from "./text";

export type Alert = { id: string; kind: string; level: "red" | "gold"; since: number; match?: { label?: string }; href?: string; blocked?: string[]; detail?: string };

export const validAlerts = (alerts: unknown): Alert[] | null =>
  Array.isArray(alerts) ? alerts.filter((a) => a && typeof a.id === "string" && Object.hasOwn(ALERT_TEXT, a.kind) && (a.level === "red" || a.level === "gold")) : null;

const X = (
  <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

function AlertCard({ alert, onSnooze }: { alert: Alert; onSnooze: (minutes: number) => void }) {
  const text = ALERT_TEXT[alert.kind];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const minutes = alert.level === "red" ? 10 : 30;
  const titleId = `alert-title-${alert.id}`;
  const href = typeof alert.href === "string" && alert.href.startsWith("/") && !alert.href.startsWith("//") ? alert.href : null;
  const open = async () => {
    if (busy || !href) return;
    setBusy(true);
    setError("");
    try {
      await invoke("open", { what: href });
    } catch {
      setError("Couldn't open the page. Open the site in your browser.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <article aria-labelledby={titleId} className={`alert-card ${alert.level} relative shrink-0 select-text border-2 border-(--alert) bg-coal p-[18px] shadow-[6px_6px_0_var(--alert-shadow)]`}>
      <button type="button" title={`Snooze for ${minutes} minutes`} aria-label={`Snooze for ${minutes} minutes`} onClick={() => onSnooze(minutes)} className="absolute right-0.5 top-0.5 grid size-10 place-items-center text-ash hover:text-paper">
        {X}
      </button>
      <h2 id={titleId} className="text-balance pr-7 font-display text-base font-black leading-[1.35] text-(--alert-ink)">{text.title}</h2>
      {alert.match?.label && <p className="mt-2 font-black [overflow-wrap:anywhere]">{alert.match.label}</p>}
      <p className="mt-3 text-[13px] leading-[1.55] text-paper/85">{text.means}</p>
      <ol className="mt-3 list-decimal space-y-[7px] pl-5 text-[13px] leading-[1.55] text-paper/85 marker:font-black marker:text-paper">
        {text.steps.map((s) => (
          <li key={s} className="pl-[3px]">{s}</li>
        ))}
      </ol>
      {alert.kind === "bracketBlocked" && !!alert.blocked?.length && (
        <ul className="mt-3 space-y-1 border-y border-line py-2.5 text-[13px] font-extrabold leading-normal [overflow-wrap:anywhere]">
          {alert.blocked.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {href && text.button && (
        <>
          <div className="mt-4 flex flex-wrap gap-2.5 px-[3px]">
            <button type="button" disabled={busy} onClick={open} className="btn btn-sm min-h-10 whitespace-normal bg-(--alert) text-(--alert-on) [--lift:var(--alert-shadow)] hover:bg-paper hover:text-ink">
              <span>{text.button}</span>
            </button>
          </div>
          {error && <p role="alert" className="mt-2.5 text-xs font-extrabold leading-normal text-rose-hi">{error}</p>}
        </>
      )}
      {alert.detail && (
        <details className="mt-3 border-t border-line pt-1.5">
          <summary className="w-fit cursor-pointer py-1 text-xs font-extrabold text-ash hover:text-paper">Details</summary>
          <pre className="mt-2 max-h-[120px] overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-normal text-paper/75 [overflow-wrap:anywhere]">{alert.detail}</pre>
        </details>
      )}
    </article>
  );
}

export function Alerts({ alerts }: { alerts: Alert[] }) {
  const [snoozes, setSnoozes] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const live = Object.entries(snoozes).filter(([id, until]) => until > now && alerts.some((a) => a.id === id));
  const snoozed = new Set(live.map(([id]) => id));
  const visible = alerts.filter((a) => !snoozed.has(a.id)).sort((a, b) => b.since - a.since);
  const nearest = Math.min(...live.map(([, until]) => until));

  useEffect(() => {
    if (!Number.isFinite(nearest)) return;
    const id = setTimeout(() => setNow(Date.now()), Math.max(0, nearest - Date.now()));
    return () => clearTimeout(id);
  }, [nearest]);

  if (!visible.length) return null;
  return (
    <aside aria-label="Match alerts" aria-live="polite" aria-relevant="additions" className="fixed inset-x-3.5 bottom-3.5 z-[9] flex max-h-[calc(100%-62px)] flex-col gap-3 overflow-y-auto overscroll-contain pb-2 pl-1.5 pr-2 pt-1.5 [scrollbar-color:var(--ash)_var(--coal)]">
      {(expanded ? visible : visible.slice(0, 3)).map((a) => (
        <AlertCard
          key={a.id}
          alert={a}
          onSnooze={(m) => {
            const t = Date.now();
            setNow(t);
            setSnoozes((s) => ({ ...s, [a.id]: t + m * 60_000 }));
          }}
        />
      ))}
      {visible.length > 3 && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-10 shrink-0 border border-line bg-coal px-3 py-[9px] font-extrabold hover:border-gold">
          {expanded ? "Show fewer" : `+${visible.length - 3} more`}
        </button>
      )}
    </aside>
  );
}
