"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";
import { SlantBg } from "@/components/site/slant";
import { useConfirm } from "@/components/admin/form";
import { setReleased } from "./actions";

export function ReleaseToggle({ stageId, released, missing, className }: { stageId: number; released: boolean; missing: string[]; className?: string }) {
  const t = useDict();
  const [on, setOn] = useState(released);
  const [pending, start] = useTransition();
  const [ask, dialog] = useConfirm();
  const Icon = on ? Eye : EyeOff;
  const release = (next: boolean) => {
    setOn(next);
    start(async () => {
      const r = await setReleased(stageId, next).catch(() => null);
      if (!r?.ok) setOn(!next);
    });
  };
  return (
    <>
    <label
      className={cn(
        "group/rel relative isolate flex h-10 w-fit items-center px-3.5 transition-[color,opacity] duration-200",
        "cursor-pointer",
        on ? "text-white" : "text-ash hover:text-paper",
        pending && "opacity-60",
        className,
      )}
    >
      <SlantBg
        className={cn(
          "border transition-[background-color,border-color,box-shadow] duration-200 group-has-[:focus-visible]/rel:ring-2 group-has-[:focus-visible]/rel:ring-rose",
          on ? "border-rose bg-rose shadow-[3px_3px_0_0_var(--rose-deep)]" : "border-line bg-ink/40 group-hover/rel:border-paper/40",
        )}
      />
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        className="sr-only"
        onChange={(e) => {
          const next = e.target.checked;
          if (!next || !missing.length) return release(next);
          ask({
            text: t.admin.pf.releaseAsk,
            yes: t.admin.poolReleased,
            onYes: () => release(true),
            body: (
              <ul className="mt-3 space-y-1 text-sm text-rose-hi">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ),
          });
        }}
      />
      <span className="flex items-center gap-2 text-xs font-display font-bold">
        <span className={cn("grid size-4 place-items-center border transition-colors", on ? "border-white bg-white text-rose" : "border-current")}>
          {on && <Check className="size-3" strokeWidth={3.5} />}
        </span>
        <Icon className="size-3.5" />
        {t.admin.poolReleased}
      </span>
    </label>
    {dialog}
    </>
  );
}
