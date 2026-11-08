import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { siteUrl } from "@/lib/links";
import { getViewer } from "@/lib/authz";
import { NAME_MAX, PIC_MAX, PIC_SIZE, owedPick, submitRequest } from "@/db/team-requests";

export const dynamic = "force-dynamic";

// sniffed from the bytes, never from the upload's own type or name
function sniff(b: Buffer) {
  if (b.length > 8 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && /^GIF8[79]a$/.test(b.toString("latin1", 0, 6))) return "image/gif";
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

const fail = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== siteUrl() && new URL(origin).host !== req.headers.get("host")) return fail("forbidden", 403);
  const v = await getViewer();
  if (!v) return fail("forbidden", 403);
  const team = await owedPick(v.osuId);
  if (!team) return fail("closed", 409);
  if (Number(req.headers.get("content-length") ?? 0) > PIC_MAX + 64 * 1024) return fail("tooBig", 413);
  const fd = await req.formData().catch(() => null);
  if (!fd) return fail("invalid");
  const name = String(fd.get("name") ?? "").replace(/[\p{C}]/gu, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX) || null;
  const file = fd.get("pic");
  let pic: { bytes: Buffer; mime: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > PIC_MAX) return fail("tooBig", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!sniff(bytes)) return fail("notImage");
    // re-encoded from the pixels, so nothing but the image survives: no metadata, no extra frames, no trailing bytes
    const img = sharp(bytes, { limitInputPixels: 50_000_000 });
    const meta = await img.metadata().catch(() => null);
    if (!meta?.width || !meta.height) return fail("notImage");
    if (meta.width !== meta.height) return fail("notSquare");
    const out = await img.rotate().resize(PIC_SIZE, PIC_SIZE).webp({ lossless: true }).toBuffer().catch(() => null);
    if (!out) return fail("notImage");
    pic = { bytes: out, mime: "image/webp" };
  }
  await submitRequest(team.id, v.osuId, name, pic);
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
