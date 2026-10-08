import { relayAuth } from "@/lib/relay";
import { relayPerms } from "@/lib/relay-perms";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const app = await relayAuth(req);
  if (!app) return Response.json({ error: "unpaired" }, { status: 401 });
  const perms = await relayPerms(app.osuId);
  return Response.json({ id: app.osuId, name: app.ircName, ref: perms.ref, stream: perms.stream });
}
