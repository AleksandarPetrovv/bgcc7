import { resolveOverlay } from "@/lib/overlay-feed";
import { overlaySettled } from "@/lib/overlay-zoom";

export const dynamic = "force-dynamic";

// an overlay tells the server its bracket animation ended; anyone can call it, so overlay-zoom only accepts reports no earlier than the animation could end
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = decodeURIComponent((await params).key).toLowerCase();
  const body = (await req.json().catch(() => null)) as { kind?: unknown; on?: unknown } | null;
  const kind = body?.kind;
  if (kind !== "reveal" && kind !== "zoom") return new Response(null, { status: 400 });
  const { matchId } = await resolveOverlay(key);
  if (matchId) overlaySettled(matchId, kind, body?.on === true);
  return new Response(null, { status: 204 });
}
