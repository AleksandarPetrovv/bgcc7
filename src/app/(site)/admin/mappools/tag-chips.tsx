import { modHi } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function TagChips({ names, label, color, filled, className }: { names: string[]; label?: string; color: string; filled?: boolean; className?: string }) {
  if (!names.length) return null;
  const c = modHi(color);
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
      {label && <span className="mr-0.5 text-[0.62rem] font-display font-bold text-ash">{label}</span>}
      {names.map((n) => (
        <span
          key={n}
          className="-skew-x-12 border px-1.5 py-px text-[0.72rem] font-display font-bold leading-snug text-paper"
          style={{ borderColor: filled ? c : `color-mix(in srgb, ${c} 55%, transparent)`, background: filled ? `color-mix(in srgb, ${c} 20%, transparent)` : undefined }}
        >
          <span className="inline-block skew-x-12">{n}</span>
        </span>
      ))}
    </span>
  );
}
