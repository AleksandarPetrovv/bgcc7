"use server";

import { eq } from "drizzle-orm";
import { db, isBGCC6 } from "@/db";
import { stages } from "@/db/schema";
import { blueprintFor } from "@/db/mappools";
import { guard } from "@/lib/admin-action";
import type { ActionResult } from "@/lib/action-result";
import { readBlueprint } from "./blueprint";

export async function saveBlueprint(stageId: number, _: ActionResult, fd: FormData) {
  return guard("host", "stage.blueprint", async () => {
    if (!isBGCC6()) return { ok: false, error: "forbidden" };
    const s = await blueprintFor(stageId);
    if (!s) return { ok: false, error: "notFound" };
    const blueprint = readBlueprint(s.slug, fd);
    await db.update(stages).set({ blueprint }).where(eq(stages.id, stageId));
    return { log: { stageId, blueprint } };
  });
}
