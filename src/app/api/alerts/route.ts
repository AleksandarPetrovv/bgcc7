import { getViewer } from "@/lib/authz";
import { alertsFor, onAlerts } from "@/lib/alerts";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

// one stream per staff tab: it only sends when this viewer's alert list changes
export async function GET(req: Request) {
  const v = await getViewer();
  if (!v?.roles.length) return new Response(null, { status: 204 });
  const host = v.roles.includes("host");
  return sse(req, async () => alertsFor(v.osuId, host), 30_000, onAlerts);
}
