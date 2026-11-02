import { getViewer } from "@/lib/authz";
import { myDraftClock, onDraft } from "@/db/drafts";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const v = await getViewer();
  if (!v) return new Response(null, { status: 204 });
  return sse(req, () => myDraftClock(v.osuId), onDraft, 4000);
}
