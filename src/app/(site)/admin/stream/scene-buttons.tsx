"use client";

import { useState, useTransition } from "react";
import { useDict } from "@/components/site/lang";
import { SCENES, type Scene } from "@/lib/scenes";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { setScene } from "./actions";

export function SceneButtons({ id, initial }: { id: string; initial: Scene | null }) {
  const t = useDict();
  const [scene, setLocal] = useState<Scene | null>(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const pick = (next: Scene | null) => {
    const prev = scene;
    setLocal(next);
    setErr(false);
    start(async () => {
      const res = await setScene(id, next);
      if (!res?.ok) {
        setLocal(prev);
        setErr(true);
      }
    });
  };
  const opts: (Scene | null)[] = [null, ...SCENES];
  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending}>
      {opts.map((s) => {
        const on = scene === s;
        return (
          <button
            key={s ?? "auto"}
            type="button"
            onClick={() => !on && pick(s)}
            aria-pressed={on}
            className={cn(
              "group/sc relative isolate inline-flex min-h-9 items-center px-3 text-xs font-display font-bold transition-colors",
              on ? (s === null ? "text-on-fill" : "text-white") : "text-ash hover:text-paper",
            )}
          >
            <SlantBg className={cn("border transition-colors", on ? (s === null ? "border-balkan bg-balkan" : "border-rose bg-rose") : "border-line group-hover/sc:border-paper")} />
            {t.admin.stream.scenes[s ?? "auto"]}
          </button>
        );
      })}
      {err && <span className="self-center text-xs font-display font-bold text-rose-hi">{t.admin.stream.failed}</span>}
    </div>
  );
}
