"use client";

import { useActionState, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { Sparkle } from "@/components/site/graphics";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";
import { setPickems } from "./actions";

export function PickemsToggle({ open }: { open: boolean }) {
  const t = useDict();
  const [on, setOn] = useState(open);
  const [state, action, pending] = useActionState(setPickems, null);
  const opts = [
    { v: true, label: t.admin.set.open, Icon: LockOpen, active: "bg-balkan text-ink shadow-[5px_5px_0_0_var(--color-balkan-deep)]", hover: "hover:border-balkan hover:text-balkan" },
    { v: false, label: t.admin.set.closed, Icon: Lock, active: "bg-rose text-white shadow-[5px_5px_0_0_var(--color-rose-deep)]", hover: "hover:border-rose hover:text-rose-hi" },
  ];
  return (
    <form action={action} className={cn("grid grid-cols-2 gap-3 sm:gap-4", pending && "opacity-70")}>
      {opts.map(({ v, label, Icon, active, hover }, i) => {
        const sel = on === v;
        return (
          <button
            key={label}
            name="open"
            value={v ? "1" : "0"}
            disabled={pending || sel}
            onClick={() => setOn(v)}
            aria-pressed={sel}
            style={{ "--i": i, "--s": "0.1s", "--d": "0.45s" } as React.CSSProperties}
            className={cn(
              "in-pop group relative flex -skew-x-6 items-center justify-center overflow-hidden border px-3 py-4 sm:px-6 sm:py-5 transition-[background-color,color,border-color,box-shadow,transform] duration-300",
              sel ? cn("border-transparent", active) : cn("border-line text-ash hover:-translate-y-0.5", hover),
            )}
          >
            <span className="flex skew-x-6 items-center gap-2.5">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full transition-colors sm:size-9", sel ? "bg-black/15" : "bg-slate")}>
                <Icon className={cn("size-4", sel && "anim-bob")} />
              </span>
              <span className="heading-slam text-lg sm:text-2xl">{label}</span>
            </span>
            {sel && (
              <span className="anim-twinkle pointer-events-none absolute right-3 top-2.5 skew-x-6" aria-hidden>
                <Sparkle className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
      {state && !pending && !state.ok && <span className="col-span-2 text-xs font-bold uppercase text-rose-hi">{t.admin.error}</span>}
    </form>
  );
}
