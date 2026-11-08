import { Fragment } from "react";

export type RichPart = { text: string; tone?: "rose" | "balkan" };

// [[rose]] and {{balkan}} highlights
export function parseRich(text: string): RichPart[] {
  return text.split(/(\[\[.+?\]\]|\{\{.+?\}\})/g).map((p) => (p.startsWith("[[") ? { text: p.slice(2, -2), tone: "rose" } : p.startsWith("{{") ? { text: p.slice(2, -2), tone: "balkan" } : { text: p }));
}

const TONE = { rose: "font-bold text-rose-hi", balkan: "font-bold text-balkan-hi" };

function renderRich(text: string, split: (s: string) => React.ReactNode, plain?: boolean) {
  return parseRich(text).map((p, k) =>
    p.tone ? (
      <strong key={k} className={plain ? "font-black text-paper" : TONE[p.tone]}>{split(p.text)}</strong>
    ) : (
      <Fragment key={k}>{split(p.text)}</Fragment>
    ),
  );
}

export function Rich({ text, plain }: { text: string; plain?: boolean }) {
  return <>{renderRich(text, (s) => s, plain)}</>;
}

// lines: in lite mode the text fades in line by line (LineIndex numbers the lines) instead of as one block
export function Words({ text, d = 0, s = 0.04, className, lines }: { text: string; d?: number; s?: number; className?: string; lines?: boolean }) {
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
    <span data-letters data-lines={lines || undefined} className={className} style={{ "--d": `${d}s`, "--s": `${s}s` } as React.CSSProperties}>
      {renderRich(text, split)}
    </span>
  );
}

export const at = (d: number, i = 0, s = 0.09) => ({ "--d": `calc(var(--cd, 0s) + ${d * 0.5}s)`, "--i": i, "--s": `${s * 0.7}s` }) as React.CSSProperties;

export function Letters({ text, d = 0, s = 0.035, plain, className }: { text: string; d?: number; s?: number; plain?: boolean; className?: string }) {
  const n = { i: 0 };
  const split = (str: string) =>
    str.split(/(\s+)/).map((w, k) => {
      if (!w || /^\s+$/.test(w)) return w;
      const start = n.i;
      n.i += w.length;
      return s < 0.01 ? (
        <span key={k} className="ltr whitespace-nowrap" style={{ "--i": start } as React.CSSProperties}>
          {w}
        </span>
      ) : (
        <span key={k} className="inline-block whitespace-nowrap">
          {[...w].map((c, j) => (
            <span key={j} className="ltr" style={{ "--i": start + j } as React.CSSProperties}>
              {c}
            </span>
          ))}
        </span>
      );
    });
  return (
    <span data-letters className={className} style={{ "--d": `${d}s`, "--s": `${s}s` } as React.CSSProperties}>
      <span className="sr-only">{parseRich(text).map((p) => p.text).join("")}</span>
      <span aria-hidden>{renderRich(text, split, plain)}</span>
    </span>
  );
}
