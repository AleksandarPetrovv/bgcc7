// the proxy in front appends the real client ip last, so earlier entries can be spoofed
export function ipOf(req: Request) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return fwd || req.headers.get("x-real-ip") || "anon";
}
