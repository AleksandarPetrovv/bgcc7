import "server-only";
import { eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "./index";

export async function writeOrder<T extends PgTable & { order: AnyPgColumn }>(table: T, key: AnyPgColumn, ids: number[]) {
  if (!Array.isArray(ids) || !ids.every((i) => Number.isInteger(i))) return false;
  for (const [order, id] of ids.entries()) await db.update(table).set({ order } as never).where(eq(key, id));
  return true;
}
