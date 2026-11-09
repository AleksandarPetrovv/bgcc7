"use client";

import { useRouter } from "next/navigation";
import { FlipCountdown } from "@/components/site/flip-countdown";
import { useDict } from "@/components/site/lang";
import { cn } from "@/lib/utils";

/** a line, the date it points at, and the overlay countdown under it; reaching zero reloads the page (opens or closes the sheet) */
export function PoolClock({ title, when, to, at, big }: { title: string; when: string; to: number | null; at: number; big?: boolean }) {
  const t = useDict();
  const router = useRouter();
  return (
    <div className={cn("flex flex-col", big ? "items-center gap-3 py-10 text-center" : "items-end gap-1 text-right")}>
      <p className={cn("font-display font-bold", big ? "text-base text-paper" : "text-xs text-ash")}>{title}</p>
      <p className={cn("num font-display font-bold", big ? "text-2xl text-rose-hi" : "text-sm text-paper")}>{when}</p>
      {to !== null && (
        <div className={big ? "mt-4" : "mt-1"} style={{ zoom: big ? 0.5 : 0.2 }}>
          <FlipCountdown to={to} at={at} labels={t.admin.pf.units} labelPx={big ? 26 : 55} onDone={() => router.refresh()} />
        </div>
      )}
    </div>
  );
}
