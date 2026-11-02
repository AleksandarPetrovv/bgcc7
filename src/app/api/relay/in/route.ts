import { relayAuth, relayIn } from "@/lib/relay";
import { relayAccess } from "@/lib/authz";
import { RELAY_IN_MAX, relayError, validEv } from "@/lib/relay-contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const app = await relayAuth(req);
  if (!app) return relayError("unpaired");
  if (!(await relayAccess(app.osuId)).ref) return relayError("noref");
  const b = (await req.json().catch(() => null)) as { ev?: unknown } | null;
  const ev = Array.isArray(b?.ev) ? b.ev.slice(0, RELAY_IN_MAX).filter(validEv) : [];
  return relayIn(app.osuId, ev) ? Response.json({ ok: true }) : relayError("norelay");
}
