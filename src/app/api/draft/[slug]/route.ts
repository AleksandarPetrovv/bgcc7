import { applyDraft, draftAccess, setResult, settle, type DraftAct } from "@/db/drafts";
import { matchIdFromSlug } from "@/lib/matches";
import { sse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: RouteContext<"/api/draft/[slug]">) {
  const id = matchIdFromSlug((await params).slug);
  if (!(await draftAccess(id))) return Response.json({ error: "forbidden" }, { status: 403 });
  return sse(req, () => settle(id), 1000);
}

export async function POST(req: Request, { params }: RouteContext<"/api/draft/[slug]">) {
  const id = matchIdFromSlug((await params).slug);
  const who = await draftAccess(id);
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as (DraftAct & { side?: number }) | { act: "result"; slot: string; winner: number | null } | null;
  if (body?.act === "result") {
    if (!who.admin || typeof body.slot !== "string") return Response.json({ error: "forbidden" }, { status: 403 });
    const w = body.winner === 1 || body.winner === 2 ? body.winner : null;
    const out = await setResult(id, body.slot, w);
    return typeof out === "string" ? Response.json({ error: out }, { status: 409 }) : Response.json(out);
  }
  if (!body || !["roll", "choose", "ban", "pick"].includes(body.act)) return Response.json({ error: "invalid" }, { status: 400 });
  const side = who.admin && (body.side === 1 || body.side === 2) ? body.side : who.side;
  if (!side) return Response.json({ error: "forbidden" }, { status: 403 });
  const res = await applyDraft(id, side, body);
  if (typeof res === "string") return Response.json({ error: res }, { status: 409 });
  return Response.json(res);
}
