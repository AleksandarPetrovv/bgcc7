import { appClosed, relayAuth } from "@/lib/relay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const app = await relayAuth(req);
  if (!app) return Response.json({ error: "unpaired" }, { status: 401 });
  await appClosed(app.osuId);
  return Response.json({ ok: true });
}
