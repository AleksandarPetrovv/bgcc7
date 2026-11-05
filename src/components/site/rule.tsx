import { cn } from "@/lib/utils";

// the pink diamond sitting on a dashed bottom rule, like the home match cards; parent needs `relative`
export function RuleDiamond({ className }: { className?: string }) {
  return <span className={cn("pointer-events-none absolute -bottom-[7px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-rose shadow-[0_0_0_3px_var(--ink)]", className)} aria-hidden />;
}
