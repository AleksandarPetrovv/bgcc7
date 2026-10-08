import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stages } from "@/db/schema";
import { getVisibility } from "@/lib/authz";
import { getFormat } from "@/db/edition";
import { packPath } from "@/lib/uploads";

export async function GET(_: Request, { params }: RouteContext<"/download/[slug]">) {
  const { slug } = await params;
  const [[stage], vis] = await Promise.all([db.select().from(stages).where(eq(stages.slug, slug)).limit(1), getVisibility()]);
  const open = stage && stage.packSize && (vis.staff || (stage.poolReleased && vis.sections.mappool));
  if (!open) return new Response("not found", { status: 404 });
  const file = packPath(stage.slug, getFormat().edition);
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("not found", { status: 404 });
  const name = `${getFormat().name} ${stage.title}.zip`;
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w .-]/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
