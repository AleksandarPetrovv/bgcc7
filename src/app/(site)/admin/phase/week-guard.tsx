"use client";

import { useCallback } from "react";
import { useConfirmWhen } from "@/components/admin/form";
import { useDict, useLang } from "@/components/site/lang";
import { poolWindows } from "@/lib/pool-window";
import { mondayOf } from "@/lib/schedule";
import { dayTime, toSofiaInput } from "@/lib/time";
import type { Format } from "@/lib/format";

/** inside the match weeks form: a new monday that puts an unsettled pool's deadline in the past asks Settle or Skip first */
export function WeekGuard({ weeks, rounds, settled, names }: { weeks: Record<string, string>; rounds: Format["rounds"]; settled: string[]; names: Record<string, string> }) {
  const t = useDict();
  const lang = useLang();
  const guard = useCallback(
    (fd: FormData) => {
      const next: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        const monday = k.startsWith("week.") && mondayOf(String(v));
        if (monday) next[k.slice(5)] = monday;
      }
      if (Object.keys({ ...weeks, ...next }).every((n) => weeks[n] === next[n])) return null;
      const now = Date.now();
      const late = poolWindows(rounds, next).find((w) => w.closes.getTime() <= now && !settled.includes(w.stage));
      if (!late) return null;
      return { text: t.admin.pf.weekAsk(names[late.stage] ?? late.stage, dayTime(toSofiaInput(late.closes), lang)), yes: t.admin.pf.settle, skip: t.admin.pf.skip };
    },
    [weeks, rounds, settled, names, t, lang],
  );
  useConfirmWhen(guard);
  return null;
}
