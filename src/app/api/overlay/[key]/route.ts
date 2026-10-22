import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { sse } from "@/lib/sse";
import { onDraft } from "@/db/drafts";
import { onLobby } from "@/lib/bancho";
import { onLive } from "@/lib/live-scores";
import { resolveOverlay, buildFeed } from "@/lib/overlay-feed";
import { alertId, clear, describeMatch, failingFor, osuIdOf, raise } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const FAILING_AFTER = 60_000;

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = decodeURIComponent((await params).key).toLowerCase();
  if (!(await resolveOverlay(key)).found) return Response.json({ error: "notfound" }, { status: 404 });

  // live packets arrive ~10/s per streamer, only this overlay's own match should wake it
  let shown: string | null = null;
  const subscribe = (fn: () => void) => {
    const offs = [onDraft(() => fn()), onLobby(() => fn()), onLive((id) => (shown === null || id === shown) && fn())];
    return () => offs.forEach((off) => off());
  };

  const id = alertId("overlayFailing", key);
  return sse(
    req,
    async () => {
      let matchId: string | null = null;
      try {
        matchId = (await resolveOverlay(key)).matchId;
        shown = matchId;
        const feed = matchId ? await buildFeed(matchId) : null;
        clear(id);
        return feed;
      } catch (e) {
        if (failingFor(id, FAILING_AFTER)) await overlayFailing(id, matchId, e).catch(() => {});
        throw e;
      }
    },
    1000,
    subscribe,
  );
}

async function overlayFailing(id: string, matchId: string | null, e: unknown) {
  const [m] = matchId ? await db.select({ streamer: matches.streamer }).from(matches).where(eq(matches.id, matchId)).limit(1) : [];
  raise(
    { id, kind: "overlayFailing", level: "gold", match: matchId ? await describeMatch(matchId) : undefined, href: "/admin/stream", detail: e instanceof Error ? e.message : String(e) },
    { hosts: true, osuIds: [await osuIdOf(m?.streamer)] },
  );
}
