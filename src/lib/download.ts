import "server-only";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

/** streams a file from disk as a download, 404 when it is missing */
export async function fileDownload(file: string, name: string, type: string) {
  const info = await stat(file).catch(() => null);
  if (!info) return new Response("not found", { status: 404 });
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w .-]/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
