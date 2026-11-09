import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stages } from "@/db/schema";
import { poolListed } from "@/lib/authz";
import { getFormat } from "@/db/edition";
import { packPath } from "@/lib/uploads";
import { fileDownload } from "@/lib/download";

export async function GET(_: Request, { params }: RouteContext<"/download/[slug]">) {
  const { slug } = await params;
  const [stage] = await db.select().from(stages).where(eq(stages.slug, slug)).limit(1);
  const open = stage && stage.packSize && (await poolListed(stage.poolReleased));
  if (!open) return new Response("not found", { status: 404 });
  return fileDownload(packPath(stage.slug, getFormat().edition), `${getFormat().name} ${stage.title}.zip`, "application/zip");
}
