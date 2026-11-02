import { createWriteStream } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebStream } from "node:stream/web";
import { eq } from "drizzle-orm";
import { currentEdition, db } from "@/db";
import { stages } from "@/db/schema";
import { clearPack } from "@/db/mappools";
import { staffFor } from "@/lib/authz";
import { logWrite } from "@/lib/admin-action";
import { PACK_MAX, packPath } from "@/lib/uploads";

async function stageOf(slug: string) {
  const [s] = await db.select({ id: stages.id, slug: stages.slug, title: stages.title }).from(stages).where(eq(stages.slug, slug)).limit(1);
  return s ?? null;
}

export async function PUT(req: Request, { params }: RouteContext<"/api/admin/mappack/[slug]">) {
  const who = await staffFor("poolEdit");
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  const stage = await stageOf((await params).slug);
  if (!stage) return Response.json({ error: "notFound" }, { status: 404 });
  if (!req.body) return Response.json({ error: "invalid" }, { status: 400 });
  if (Number(req.headers.get("content-length") ?? 0) > PACK_MAX) return Response.json({ error: "tooBig" }, { status: 413 });

  const dest = packPath(stage.slug, currentEdition());
  const tmp = `${dest}.${Date.now()}.part`;
  await mkdir(path.dirname(dest), { recursive: true });
  let size = 0;
  const count = new Transform({
    transform(chunk: Buffer, _, cb) {
      size += chunk.length;
      cb(size > PACK_MAX ? new Error("tooBig") : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as unknown as WebStream), count, createWriteStream(tmp));
    const fh = await open(tmp, "r");
    const head = Buffer.alloc(4);
    await fh.read(head, 0, 4, 0);
    await fh.close();
    if (size < 22 || head.readUInt32LE(0) !== 0x04034b50) throw new Error("notZip");
    await rename(tmp, dest);
  } catch (e) {
    await rm(tmp, { force: true });
    const msg = e instanceof Error ? e.message : "";
    return Response.json({ error: msg === "tooBig" ? "tooBig" : msg === "notZip" ? "notZip" : "failed" }, { status: 400 });
  }
  await db.update(stages).set({ packSize: size, packAt: new Date() }).where(eq(stages.id, stage.id));
  await logWrite(who.osuId, "pack.upload", { stage: stage.title, size });
  return Response.json({ ok: true, size });
}

export async function DELETE(_: Request, { params }: RouteContext<"/api/admin/mappack/[slug]">) {
  const who = await staffFor("poolEdit");
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  const stage = await stageOf((await params).slug);
  if (!stage) return Response.json({ error: "notFound" }, { status: 404 });
  await clearPack(stage.id);
  await logWrite(who.osuId, "pack.delete", { stage: stage.title });
  return Response.json({ ok: true });
}
