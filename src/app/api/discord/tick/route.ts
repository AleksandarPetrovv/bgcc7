import { createHash, timingSafeEqual } from "node:crypto";
import { ensureEdition, withEdition } from "@/db";
import { tick } from "@/db/discord-bot";

export const dynamic = "force-dynamic";

const key = () => createHash("sha256").update(`discord-tick:${process.env.AUTH_SECRET ?? ""}`).digest();

// called every minute by instrumentation.ts from inside the container; the header proves it
export async function POST(req: Request) {
  const got = Buffer.from(req.headers.get("x-tick") ?? "", "hex");
  if (!process.env.AUTH_SECRET || got.length !== 32 || !timingSafeEqual(got, key())) return new Response(null, { status: 404 });
  await ensureEdition();
  await withEdition("site", tick).catch((e) => console.error("[discord] tick", e));
  return new Response(null, { status: 204 });
}
