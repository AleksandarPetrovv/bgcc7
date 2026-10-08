"use client";

import { useState, useTransition } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";
import { setReleased } from "./actions";

export function ReleaseToggle({ stageId, released }: { stageId: number; released: boolean }) {
  const t = useDict();
  const [on, setOn] = useState(released);
  const [pending, start] = useTransition();
  const Icon = on ? Eye : EyeOff;
  return (
    <label
      className={cn(
        "flex h-10 w-fit -skew-x-12 cursor-pointer items-center border px-3.5 transition-[color,background-color,border-color,box-shadow,opacity] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose",
        on ? "border-rose bg-rose text-white shadow-[3px_3px_0_0_var(--color-rose-deep)]" : "border-line bg-ink/40 text-ash hover:border-paper/40 hover:text-paper",
        pending && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        className="sr-only"
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const r = await setReleased(stageId, next).catch(() => null);
            if (!r?.ok) setOn(!next);
          });
        }}
      />
      <span className="flex skew-x-12 items-center gap-2 text-xs font-black uppercase">
        <span className={cn("grid size-4 place-items-center border transition-colors", on ? "border-white bg-white text-rose" : "border-current")}>
          {on && <Check className="size-3" strokeWidth={3.5} />}
        </span>
        <Icon className="size-3.5" />
        {t.admin.poolReleased}
      </span>
    </label>
  );
}
