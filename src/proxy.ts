import { NextResponse, type NextRequest } from "next/server";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ipOf } from "@/lib/ip";
import { siteUrl } from "@/lib/links";

const tier = (points: number) => new RateLimiterMemory({ points, duration: 60 });

const LIMITS = {
  auth: tier(30),
  osu: tier(60),
  stream: tier(40),
  write: tier(120),
  download: tier(10),
  relay: tier(1500),
  page: tier(600),
  // requests without any ip header: only the in-container discord tick, which proves itself with a key
  internal: tier(120),
};

function bucket(req: NextRequest, path: string): keyof typeof LIMITS {
  if (path.startsWith("/api/auth") || path === "/api/relay/start") return "auth";
  // the helper's busy calls; its /me and /stream polls are GETs (page tier) and /bye is a POST (write tier) on purpose
  if (path === "/api/relay/in" || path === "/api/relay/claim" || path === "/api/relay/score") return "relay";
  if (path.startsWith("/download/")) return "download";
  if (req.method !== "GET" && req.method !== "HEAD") return "write";
  if (path.startsWith("/api/matches/")) return "osu";
  if (path.startsWith("/api/draft/") || path.startsWith("/api/lobby/")) return "stream";
  return "page";
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const site = siteUrl();
  if (site && req.headers.get("host")?.startsWith("www.")) {
    return NextResponse.redirect(`${site}${path}${req.nextUrl.search}`, 308);
  }
  const ip = ipOf(req);
  const b = ip === "anon" ? "internal" : bucket(req, path);
  try {
    await LIMITS[b].consume(`${b}:${ip}`);
  } catch {
    return new NextResponse("slow down", { status: 429, headers: { "Retry-After": "60" } });
  }
  if (path.startsWith("/api/") || /\.[a-zA-Z0-9]+$/.test(path)) return NextResponse.next();
  const lower = path.toLowerCase();
  if (path === lower) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = lower;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // uploads skip the proxy: with it Next buffers only the first 10MB of a body and the route gets a cut-off file
  matcher: ["/((?!_next/static|_next/image|favicon|api/admin/mappack/[^/]+$|api/team-request$).*)"],
};
