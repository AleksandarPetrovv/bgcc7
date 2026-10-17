"use client";

import { useState } from "react";
import { Field } from "@/components/admin/form";

const tidy = (v: string[]) => [...v.filter((x) => x.trim()), ""];

export function MpLinks({ name, initial, className }: { name: string; initial: string[]; className?: string }) {
  const [vals, setVals] = useState(() => tidy(initial));
  const set = (i: number, x: string) => {
    const next = vals.map((v, k) => (k === i ? x : v));
    setVals(next[next.length - 1].trim() ? [...next, ""] : next);
  };
  return (
    <span className="flex flex-col gap-2">
      {vals.map((v, i) => (
        <Field key={i} name={name} value={v} onChange={(e) => set(i, e.target.value)} onBlur={() => setVals(tidy(vals))} className={className} />
      ))}
    </span>
  );
}
