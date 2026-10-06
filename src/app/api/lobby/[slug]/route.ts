import { draftAccess } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { matchIdFromSlug } from "@/lib/format";
import { ensureBot, lobbyView, onLobby } from "@/lib/bancho";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const id = matchIdFromSlug(await getFormat(), (await params).slug);
  const who = await draftAccess(id);
  if (!who?.admin) return Response.json({ error: "forbidden" }, { status: 403 });
  void ensureBot().catch((e) => console.error("[bancho]", e));
  return sse(req, () => lobbyView(id, who.osuId), 3000, onLobby);
}
