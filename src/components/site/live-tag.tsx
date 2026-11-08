"use client";

import { cn } from "@/lib/utils";
import { useDict } from "./lang";

export function LiveTag({ className }: { className?: string }) {
  const t = useDict();
  return (
    <span className={cn("inline-flex items-center gap-1 bg-rose px-1.5 py-0.5 text-[0.6rem] font-display font-bold leading-none text-white", className)}>
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
      {t.common.live}
    </span>
  );
}
