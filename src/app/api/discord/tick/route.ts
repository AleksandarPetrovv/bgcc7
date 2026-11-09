import { timingSafeEqual } from "node:crypto";
import { tickKey } from "@/lib/boot";
import { ensureEdition, withEdition } from "@/db";
import { tick } from "@/db/discord-bot";
import { poolTick } from "@/db/pool-settle";

export const dynamic = "force-dynamic";

const key = () => Buffer.from(tickKey(process.env.AUTH_SECRET ?? ""), "hex");

// called every minute by instrumentation.ts from inside the container; the header proves it
export async function POST(req: Request) {
  const got = Buffer.from(req.headers.get("x-tick") ?? "", "hex");
  if (!process.env.AUTH_SECRET || got.length !== 32 || !timingSafeEqual(got, key())) return new Response(null, { status: 404 });
  await ensureEdition();
  await withEdition("site", tick).catch((e) => console.error("[discord] tick", e));
  await withEdition("site", poolTick).catch((e) => console.error("[pools] tick", e));
  return new Response(null, { status: 204 });
}
