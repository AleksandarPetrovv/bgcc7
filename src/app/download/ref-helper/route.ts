import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/uploads";

export async function GET() {
  const file = path.join(UPLOAD_DIR, "refhelper", "BGCC7 Ref Helper.exe");
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("not found", { status: 404 });
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": "application/vnd.microsoft.portable-executable",
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename="BGCC7 Ref Helper.exe"`,
      "Cache-Control": "no-store",
    },
  });
}
