import { optImg } from "@/lib/img";

const TTL = 600_000;
const alive = new Map<string, { at: number; ok: boolean }>();

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const src = q.get("u") ?? "";
  const back = q.get("f") ?? "";
  const fallback = /^\/api\/av\/\d{1,12}$/.test(back) ? back : "/favicon.ico";
  if (!/^https:\/\/([\w-]+\.)?s-ul\.eu\//.test(src)) return new Response("bad url", { status: 400 });
  let hit = alive.get(src);
  if (!hit || Date.now() - hit.at > TTL) {
    const res = await fetch(src, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(4000) }).catch(() => null);
    hit = { at: Date.now(), ok: !!res?.ok };
    if (alive.size > 500) alive.delete(alive.keys().next().value!);
    alive.set(src, hit);
  }
  return new Response(null, { status: 302, headers: { Location: hit.ok ? optImg(src) : fallback, "Cache-Control": "public, max-age=600" } });
}
