import { appClosed, relayAuth } from "@/lib/relay";
import { relayError } from "@/lib/relay-contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const app = await relayAuth(req);
  if (!app) return relayError("unpaired");
  await appClosed(app.osuId);
  return Response.json({ ok: true });
}
