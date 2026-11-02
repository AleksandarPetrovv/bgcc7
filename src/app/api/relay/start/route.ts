import { startLink } from "@/lib/relay";
import { relayError, startRes, validState } from "@/lib/relay-contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (typeof b?.state !== "string" || !validState(b.state)) return relayError("invalid");
  const code = startLink(b.state);
  return code ? Response.json(startRes(code)) : relayError("busy");
}
