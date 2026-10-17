import { claim, validState } from "@/lib/relay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { state?: unknown; irc?: unknown } | null;
  if (typeof b?.state !== "string" || !validState(b.state) || typeof b.irc !== "string" || !b.irc.trim()) return Response.json({ error: "invalid" }, { status: 400 });
  const r = await claim(b.state, b.irc);
  if (r === "pending") return Response.json({ pending: true }, { status: 202 });
  if (r === "wrongname") return Response.json({ error: r }, { status: 403 });
  return Response.json({ token: r.token });
}
