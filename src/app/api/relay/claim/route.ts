import { claim } from "@/lib/relay";
import { CLAIM_PENDING, claimRes, relayError, validState } from "@/lib/relay-contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (typeof b?.state !== "string" || !validState(b.state)) return relayError("invalid");
  const r = await claim(b.state);
  if (r === "pending") return Response.json(CLAIM_PENDING, { status: 202 });
  if (r === "wrongname") return relayError(r);
  return Response.json(claimRes(r.token, r.name));
}
