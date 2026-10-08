import { relayAuth, relayStream, unpair } from "@/lib/relay";
import { relayPerms } from "@/lib/relay-perms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const app = await relayAuth(req);
  if (!app) return Response.json({ error: "unpaired" }, { status: 401 });
  const perms = await relayPerms(app.osuId);
  if (!perms.ref && !perms.stream) return Response.json({ error: "noroles" }, { status: 403 });
  return relayStream(req, app.osuId, app.ircName);
}

export async function DELETE(req: Request) {
  const app = await relayAuth(req);
  if (app) await unpair(app.osuId);
  return Response.json({ ok: true });
}
