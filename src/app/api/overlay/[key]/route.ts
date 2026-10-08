import { sse } from "@/lib/sse";
import { onDraft } from "@/db/drafts";
import { onLobby } from "@/lib/bancho";
import { onLive } from "@/lib/live-scores";
import { resolveOverlay, buildFeed } from "@/lib/overlay-feed";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = decodeURIComponent((await params).key).toLowerCase();
  if (!(await resolveOverlay(key)).found) return Response.json({ error: "notfound" }, { status: 404 });

  const subscribe = (fn: () => void) => {
    const offs = [onDraft(() => fn()), onLobby(() => fn()), onLive(() => fn())];
    return () => offs.forEach((off) => off());
  };

  return sse(
    req,
    async () => {
      const r = await resolveOverlay(key);
      return r.matchId ? buildFeed(r.matchId) : null;
    },
    1000,
    subscribe,
  );
}
