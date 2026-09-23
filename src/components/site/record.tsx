import type { Dict } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";

export function RecordText({ t, w, l, className }: { t: Dict; w: number; l: number; className?: string }) {
  return (
    <span className={cn("num whitespace-nowrap", className)}>
      <span className={w ? "text-balkan" : "text-ash"}>{t.common.wins(w)}</span>
      <span className="text-ash"> · </span>
      <span className={l ? "text-rose-hi" : "text-ash"}>{t.common.losses(l)}</span>
    </span>
  );
}
