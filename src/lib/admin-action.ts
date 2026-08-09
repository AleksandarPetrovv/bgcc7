import "server-only";
import { revalidatePath } from "next/cache";
import { log, requireRole } from "./authz";
import type { ActionResult, Perm } from "./roles";

export async function guard(perm: Perm, action: string, fn: (osuId: number) => Promise<ActionResult | unknown>): Promise<ActionResult> {
  let osuId: number;
  try {
    osuId = (await requireRole(perm)).osuId;
  } catch {
    return { ok: false, error: "forbidden" };
  }
  try {
    const res = await fn(osuId);
    if (res && typeof res === "object" && "ok" in res && !res.ok) return res as ActionResult;
    await log(osuId, action, res && typeof res === "object" && !("ok" in res) ? res : undefined);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    console.error("[admin]", action, e);
    return { ok: false };
  }
}
