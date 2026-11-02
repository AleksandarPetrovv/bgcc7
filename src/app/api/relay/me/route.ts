import { alertsFor } from "@/lib/alerts";
import { relayAccess } from "@/lib/authz";
import { relayAuth } from "@/lib/relay";
import { relayError, relayMe } from "@/lib/relay-contract";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const app = await relayAuth(req);
  if (!app) return relayError("unpaired");
  const a = await relayAccess(app.osuId);
  return Response.json(relayMe(app.osuId, app.ircName, a, alertsFor(app.osuId, a.host)));
}
