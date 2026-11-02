import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stages } from "@/db/schema";
import { getVisibility } from "@/lib/authz";
import { getFormat } from "@/db/edition";
import { packPath } from "@/lib/uploads";
import { fileDownload } from "@/lib/download";
import { poolVisible } from "@/app/(site)/mappool/shown";

export async function GET(_: Request, { params }: RouteContext<"/download/[slug]">) {
  const { slug } = await params;
  const [[stage], vis] = await Promise.all([db.select().from(stages).where(eq(stages.slug, slug)).limit(1), getVisibility()]);
  const open = stage && stage.packSize && poolVisible(stage.poolReleased, vis);
  if (!open) return new Response("not found", { status: 404 });
  return fileDownload(packPath(stage.slug, getFormat().edition), `${getFormat().name} ${stage.title}.zip`, "application/zip");
}
