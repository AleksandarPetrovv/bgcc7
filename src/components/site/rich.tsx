import { Fragment } from "react";

export function Rich({ text, plain }: { text: string; plain?: boolean }) {
  const parts = text.split(/(\[\[.+?\]\]|\{\{.+?\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[[") ? (
          <strong key={i} className={plain ? "font-black text-paper" : "font-bold text-rose-hi"}>{p.slice(2, -2)}</strong>
        ) : p.startsWith("{{") ? (
          <strong key={i} className={plain ? "font-black text-paper" : "font-bold text-balkan-hi"}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Words({ text, d = 0, s = 0.04, className }: { text: string; d?: number; s?: number; className?: string }) {
  let i = 0;
  const split = (str: string) =>
    str.split(/(\s+)/).map((w, k) =>
      !w || /^\s+$/.test(w) ? (
        w
      ) : (
        <span key={k} className="word" style={{ "--i": i++ } as React.CSSProperties}>
          {w}
        </span>
      ),
    );
  return (
    <span className={className} style={{ "--d": `${d}s`, "--s": `${s}s` } as React.CSSProperties}>
      {text.split(/(\[\[.+?\]\]|\{\{.+?\}\})/g).map((p, k) =>
        p.startsWith("[[") ? (
          <strong key={k} className="font-bold text-rose-hi">{split(p.slice(2, -2))}</strong>
        ) : p.startsWith("{{") ? (
          <strong key={k} className="font-bold text-balkan-hi">{split(p.slice(2, -2))}</strong>
        ) : (
          <Fragment key={k}>{split(p)}</Fragment>
        ),
      )}
    </span>
  );
}

export const at = (d: number, i = 0, s = 0.09) => ({ "--d": `calc(var(--cd, 0s) + ${d}s)`, "--i": i, "--s": `${s}s` }) as React.CSSProperties;

export function Letters({ text, d = 0, s = 0.035, plain, className }: { text: string; d?: number; s?: number; plain?: boolean; className?: string }) {
  let i = 0;
  const split = (str: string) =>
    str.split(/(\s+)/).map((w, k) =>
      !w || /^\s+$/.test(w) ? (
        w
      ) : (
        <span key={k} className="inline-block whitespace-nowrap">
          {[...w].map((c, j) => (
            <span key={j} className="ltr" style={{ "--i": i++ } as React.CSSProperties}>
              {c}
            </span>
          ))}
        </span>
      ),
    );
  const parts = text.split(/(\[\[.+?\]\]|\{\{.+?\}\})/g);
  return (
    <span className={className} style={{ "--d": `${d}s`, "--s": `${s}s` } as React.CSSProperties}>
      <span className="sr-only">{parts.map((p) => (p.startsWith("[[") || p.startsWith("{{") ? p.slice(2, -2) : p)).join("")}</span>
      <span aria-hidden>
        {parts.map((p, k) =>
          p.startsWith("[[") ? (
            <strong key={k} className={plain ? "font-black text-paper" : "font-bold text-rose-hi"}>{split(p.slice(2, -2))}</strong>
          ) : p.startsWith("{{") ? (
            <strong key={k} className={plain ? "font-black text-paper" : "font-bold text-balkan-hi"}>{split(p.slice(2, -2))}</strong>
          ) : (
            <Fragment key={k}>{split(p)}</Fragment>
          ),
        )}
      </span>
    </span>
  );
}
