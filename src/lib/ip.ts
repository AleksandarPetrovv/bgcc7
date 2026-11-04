// cloudflare tunnel is the only way in (app port is localhost-only), so its header is trusted
export function ipOf(req: Request) {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  const fwd = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return cf || fwd || req.headers.get("x-real-ip") || "anon";
}
