import "server-only";
import { revalidatePath } from "next/cache";
import { log, staffFor, type Viewer } from "./authz";
import { canRunMatch } from "./match-access";
import type { Perm } from "./roles";
import type { ActionName } from "./action-names";
import type { ActionError, ActionResult } from "./action-result";

export type Outcome = void | { ok: false; error?: ActionError; slot?: string } | typeof unchanged | { log: Record<string, unknown> };
export const unchanged = { ok: true } as const;

export async function logWrite(osuId: number, action: ActionName, payload?: Record<string, unknown>) {
  await log(osuId, action, payload);
  revalidatePath("/", "layout");
}

type Opts = { match?: string };

export async function guard(perm: Perm | readonly Perm[], action: ActionName, fn: (v: Viewer) => Promise<Outcome>, opts: Opts = {}): Promise<ActionResult> {
  try {
    const v = await staffFor(perm);
    if (!v || (opts.match !== undefined && !(await canRunMatch(opts.match)))) return { ok: false, error: "forbidden" };
    const res = await fn(v);
    if (res && "ok" in res) return res.ok ? { ok: true } : res;
    await logWrite(v.osuId, action, res?.log);
    return { ok: true };
  } catch (e) {
    console.error("[admin]", action, e);
    return { ok: false };
  }
}
