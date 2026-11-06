import { startLink, validState } from "@/lib/relay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (typeof b?.state !== "string" || !validState(b.state)) return Response.json({ error: "invalid" }, { status: 400 });
  const code = startLink(b.state);
  return code ? Response.json({ code }) : Response.json({ error: "busy" }, { status: 503 });
}
