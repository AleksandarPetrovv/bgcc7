"use server";

import { eq } from "drizzle-orm";
import { db, isBGCC6 } from "@/db";
import { stages } from "@/db/schema";
import { blueprintFor } from "@/db/mappools";
import { guard } from "@/lib/admin-action";
import { isBracketStage } from "@/lib/format";
import { MOD_ORDER } from "@/lib/mods";
import type { ActionResult } from "@/lib/action-result";

export async function saveBlueprint(stageId: number, _: ActionResult, fd: FormData) {
  return guard("phase", "stage.blueprint", async () => {
    if (!isBGCC6()) return { ok: false, error: "forbidden" };
    const s = await blueprintFor(stageId);
    if (!s) return { ok: false, error: "notFound" };
    const quals = !isBracketStage(s.slug);
    const blueprint: Record<string, number> = {};
    for (const mod of MOD_ORDER) {
      if (mod === "Tiebreaker") {
        if (!quals) blueprint[mod] = 1;
        continue;
      }
      if (quals && mod === "FreeMod") continue;
      const n = Math.floor(Number(fd.get(mod) ?? 0));
      if (Number.isFinite(n) && n > 0) blueprint[mod] = Math.min(n, 99);
    }
    await db.update(stages).set({ blueprint }).where(eq(stages.id, stageId));
    return { log: { stageId, blueprint } };
  });
}
