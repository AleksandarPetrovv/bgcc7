import { relayAuth, relayStream, unpair } from "@/lib/relay";
import { relayAccess } from "@/lib/authz";
import { relayError } from "@/lib/relay-contract";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const app = await relayAuth(req);
  if (!app) return relayError("unpaired");
  const a = await relayAccess(app.osuId);
  if (!a.any) return relayError("noroles");
  return relayStream(req, app.osuId, app.ircName, a.host);
}

export async function DELETE(req: Request) {
  const app = await relayAuth(req);
  if (app) await unpair(app.osuId);
  return Response.json({ ok: true });
}
