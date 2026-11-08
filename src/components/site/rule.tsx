import { cn } from "@/lib/utils";

// the pink diamond sitting on a dashed bottom rule, like the home match cards; parent needs `relative`
export function RuleDiamond({ className }: { className?: string }) {
  return <span className={cn("pointer-events-none absolute -bottom-[7px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-rose", className)} aria-hidden />;
}

// a heading's trailing rule ending in a pink diamond; parent is a flex row
export function LineDiamond({ line = "border-t-2 border-dashed" }: { line?: string }) {
  return (
    <>
      <span className={`h-px flex-1 border-line ${line}`} aria-hidden />
      <span className="size-2 shrink-0 rotate-45 bg-rose" aria-hidden />
    </>
  );
}
