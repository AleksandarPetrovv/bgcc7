import "server-only";
import { bootEdition, bootedEdition } from "@/lib/boot";
import { currentEdition, withEdition } from "./edition-context";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { Edition } from "@/lib/format";

const url = process.env.DATABASE_URL ?? "postgres://unset@127.0.0.1:1/unset";
const g = globalThis as unknown as { pgBGCC6?: ReturnType<typeof postgres>; pg?: ReturnType<typeof postgres> };
// bgcc6 lives in the public schema, the current edition in the bgcc7 schema
const clientBGCC6 = g.pgBGCC6 ?? postgres(url, { max: 10 });
const client = g.pg ?? postgres(url, { max: 6, connection: { search_path: "bgcc7,public" } });
if (process.env.NODE_ENV !== "production") {
  g.pgBGCC6 = clientBGCC6;
  g.pg = client;
}

export const dbBGCC6 = drizzle(clientBGCC6, { schema });
const base = drizzle(client, { schema });

export { EDITION_COOKIE, currentEdition, editionKey, isBGCC6, siteEdition, withEdition } from "./edition-context";

export const detached = (what: string, fn: () => Promise<unknown>) => {
  const ed = currentEdition();
  void withEdition(ed, fn).catch((e) => console.error(`[${what}]`, e));
};
export async function ensureEdition() {
  if (bootedEdition()) return;
  await bootEdition(clientBGCC6).catch((e) => console.error("[db] edition", e));
}

export const dbOf = (e: Edition) => (e === "bgcc6" ? dbBGCC6 : base);
export type Tx = Parameters<Parameters<typeof base.transaction>[0]>[0];

export const db: typeof base = new Proxy(base, {
  get(_, k) {
    const d = dbOf(currentEdition());
    const v = Reflect.get(d, k, d);
    return typeof v === "function" ? v.bind(d) : v;
  },
});
