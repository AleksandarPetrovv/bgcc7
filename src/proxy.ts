import { NextResponse, type NextRequest } from "next/server";
import { RateLimiterMemory } from "rate-limiter-flexible";

const tier = (points: number) => new RateLimiterMemory({ points, duration: 60 });

const LIMITS = {
  auth: tier(30),
  osu: tier(60),
  stream: tier(40),
  write: tier(120),
  download: tier(10),
  relay: tier(1500),
  page: tier(600),
};

function bucket(req: NextRequest, path: string): keyof typeof LIMITS {
  if (path.startsWith("/api/auth")) return "auth";
  if (path === "/api/relay/in" || path === "/api/relay/claim") return "relay";
  if (path.startsWith("/download/")) return "download";
  if (req.method !== "GET" && req.method !== "HEAD") return "write";
  if (path.startsWith("/api/matches/")) return "osu";
  if (path.startsWith("/api/draft/") || path.startsWith("/api/lobby/")) return "stream";
  return "page";
}

function ipOf(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return fwd || req.headers.get("x-real-ip") || "anon";
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = ipOf(req);
  const b = bucket(req, path);
  try {
    await LIMITS[b].consume(`${b}:${ip}`, ip === "anon" ? 0.2 : 1);
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
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
