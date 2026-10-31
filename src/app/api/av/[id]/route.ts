import { firstFrame, keepLastFrame } from "@/lib/gif";

const TTL = 3_600_000;
const cache = new Map<string, { at: number; body: Uint8Array; type: string }>();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) return new Response("bad id", { status: 400 });
  const anim = new URL(req.url).searchParams.has("anim");
  const key = anim ? `${id}a` : id;
  let hit = cache.get(key);
  if (!hit || Date.now() - hit.at > TTL) {
    const res = await fetch(`https://a.ppy.sh/${id}`, { cache: "no-store", signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!res?.ok) return Response.redirect(`https://a.ppy.sh/${id}`, 302);
    const raw = new Uint8Array(await res.arrayBuffer());
    const gif = raw[0] === 0x47 && raw[1] === 0x49 && raw[2] === 0x46;
    hit = { at: Date.now(), body: gif ? (anim ? keepLastFrame(raw) : firstFrame(raw)) : raw, type: gif ? "image/gif" : (res.headers.get("content-type") ?? "image/jpeg") };
    if (cache.size > 800) cache.delete(cache.keys().next().value!);
    cache.set(key, hit);
  }
  return new Response(hit.body as BodyInit, { headers: { "Content-Type": hit.type, "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
