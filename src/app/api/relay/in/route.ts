import { relayAuth, relayIn, type RelayEv } from "@/lib/relay";
import { relayPerms } from "@/lib/relay-perms";

export const dynamic = "force-dynamic";

const valid = (e: unknown): e is RelayEv => {
  const x = e as RelayEv | null;
  return !!x && (x.t === "opened" || x.t === "closed" || (x.t === "line" && typeof x.l === "string" && x.l.length < 4096));
};

export async function POST(req: Request) {
  const app = await relayAuth(req);
  if (!app) return Response.json({ error: "unpaired" }, { status: 401 });
  if (!(await relayPerms(app.osuId)).ref) return Response.json({ error: "noref" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { ev?: unknown } | null;
  const ev = Array.isArray(b?.ev) ? b.ev.slice(0, 500).filter(valid) : [];
  return relayIn(app.osuId, ev) ? Response.json({ ok: true }) : Response.json({ error: "nostream" }, { status: 409 });
}
