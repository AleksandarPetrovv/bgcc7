import "server-only";
import { execFile } from "node:child_process";
import { readdir, unlink } from "node:fs/promises";
import { promisify } from "node:util";

const DIR = "/backups";
const KEEP = 10;

/**
 * a full database dump right before an action that can't be undone (restore: pg_restore --clean --if-exists -d bgcc7 <file>).
 * throws when it fails so the action never runs without one; off where BACKUP_DATABASE_URL is unset (dev)
 */
export async function snapshot(action: string) {
  const url = process.env.BACKUP_DATABASE_URL;
  if (!url) return;
  const file = `${DIR}/auto-${new Date().toISOString().replace(/[:.]/g, "-")}-${action}.dump`;
  await promisify(execFile)("pg_dump", ["-Fc", "-f", file, url], { timeout: 120_000 });
  const old = (await readdir(DIR)).filter((f) => f.startsWith("auto-")).sort().slice(0, -KEEP);
  await Promise.all(old.map((f) => unlink(`${DIR}/${f}`)));
}
