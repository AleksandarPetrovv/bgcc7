"use client";

import { useState, useTransition } from "react";
import { useDict } from "@/components/site/lang";
import { SCENES, type Scene } from "@/lib/scenes";
import { cn } from "@/lib/utils";
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
              "inline-flex min-h-9 -skew-x-12 items-center border px-3 text-xs font-black uppercase tracking-wide transition-colors",
              on ? (s === null ? "border-balkan bg-balkan text-ink" : "border-rose bg-rose text-white") : "border-line text-ash hover:border-paper hover:text-paper",
            )}
          >
            <span className="skew-x-12">{t.admin.stream.scenes[s ?? "auto"]}</span>
          </button>
        );
      })}
      {err && <span className="self-center text-xs font-black uppercase tracking-wide text-rose-hi">{t.admin.stream.failed}</span>}
    </div>
  );
}
