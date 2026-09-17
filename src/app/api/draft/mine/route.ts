import { getViewer } from "@/lib/authz";
import { myOpenDraft } from "@/db/drafts";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const v = await getViewer();
  if (!v) return new Response(null, { status: 204 });
  return sse(req, async () => ({ slug: await myOpenDraft(v.osuId) }), 5000);
}
