import { timingSafeEqual } from "node:crypto";
import { tickKey } from "@/lib/boot";
import { ensureEdition, withEdition } from "@/db";
import { checkResults, tick } from "@/db/discord-bot";
import { poolTick } from "@/db/pool-settle";
import { globalStore } from "@/lib/global-store";

export const dynamic = "force-dynamic";

const key = () => Buffer.from(tickKey(process.env.AUTH_SECRET ?? ""), "hex");
const busy = globalStore("bgccTickBusy", () => new Set<string>());

// each job has its own guard, so a slow one is skipped next minute without holding up the others
async function once(name: string, fn: () => Promise<unknown>) {
  if (busy.has(name)) return;
  busy.add(name);
  try {
    await withEdition("site", fn);
  } catch (e) {
    console.error(`[tick] ${name}`, e);
  } finally {
    busy.delete(name);
  }
}

// called every minute by instrumentation.ts from inside the container; the header proves it
export async function POST(req: Request) {
  const got = Buffer.from(req.headers.get("x-tick") ?? "", "hex");
  if (!process.env.AUTH_SECRET || got.length !== 32 || !timingSafeEqual(got, key())) return new Response(null, { status: 404 });
  await ensureEdition();
  await Promise.all([once("results", checkResults), once("discord", tick), once("pools", poolTick)]);
  return new Response(null, { status: 204 });
}
