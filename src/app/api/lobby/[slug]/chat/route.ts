import { draftAccess } from "@/db/drafts";
import { getFormat } from "@/db/edition";
import { lobbyChatHistory } from "@/lib/chat-history";
import { matchIdFromSlug } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: RouteContext<"/api/lobby/[slug]/chat">) {
  const id = matchIdFromSlug(await getFormat(), (await params).slug);
  const access = await draftAccess(id);
  const headers = { "Cache-Control": "private, no-store" };
  if (!access) return Response.json({ error: "forbidden" }, { status: 403, headers });

  const cursor = new URL(req.url).searchParams.get("before");
  if (cursor !== null && (!/^[1-9]\d*$/.test(cursor) || Number(cursor) > 2_147_483_647)) {
    return Response.json({ error: "invalid" }, { status: 400, headers });
  }

  try {
    const page = await lobbyChatHistory(id, access.admin, cursor === null ? undefined : Number(cursor));
    return Response.json(page, { headers });
  } catch (error) {
    console.error("[lobby] chat history", error);
    return Response.json({ error: "failed" }, { status: 500, headers });
  }
}
