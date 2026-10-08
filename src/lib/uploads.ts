import "server-only";
import path from "node:path";

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
export const PACK_MAX = 1024 * 1024 * 1024;

export const packPath = (slug: string, edition: string) => path.join(UPLOAD_DIR, "packs", edition.replace(/[^\w-]/g, ""), `${slug.replace(/[^\w-]/g, "")}.zip`);
