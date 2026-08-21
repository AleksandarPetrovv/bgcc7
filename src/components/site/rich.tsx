import { Fragment } from "react";

export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[\[.+?\]\]|\{\{.+?\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[[") ? (
          <strong key={i} className="font-bold text-rose-hi">{p.slice(2, -2)}</strong>
        ) : p.startsWith("{{") ? (
          <strong key={i} className="font-bold text-balkan">{p.slice(2, -2)}</strong>
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
          <strong key={k} className="font-bold text-balkan">{split(p.slice(2, -2))}</strong>
        ) : (
          <Fragment key={k}>{split(p)}</Fragment>
        ),
      )}
    </span>
  );
}

export function Letters({ text, d = 0, s = 0.035, className }: { text: string; d?: number; s?: number; className?: string }) {
  return (
    <span className={className} style={{ "--d": `${d}s`, "--s": `${s}s` } as React.CSSProperties} aria-label={text}>
      {[...text].map((c, i) => (
        <span key={i} className="ltr" style={{ "--i": i } as React.CSSProperties} aria-hidden>
          {c === " " ? "\u00a0" : c}
        </span>
      ))}
    </span>
  );
}
