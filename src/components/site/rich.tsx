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
