import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { Edition } from "@/lib/format";

const url = process.env.DATABASE_URL ?? "postgres://unset@127.0.0.1:1/unset";
const g = globalThis as unknown as { pg?: ReturnType<typeof postgres>; pg7?: ReturnType<typeof postgres>; bgccEdition?: Edition };
const client = g.pg ?? postgres(url, { max: 10 });
const client7 = g.pg7 ?? postgres(url, { max: 6, connection: { search_path: "bgcc7,public" } });
if (process.env.NODE_ENV !== "production") {
  g.pg = client;
  g.pg7 = client7;
}

export const db6 = drizzle(client, { schema });
export const db7 = drizzle(client7, { schema });

export const currentEdition = (): Edition => g.bgccEdition ?? "bgcc6";
export const setCurrentEdition = (e: Edition) => {
  g.bgccEdition = e;
};

export async function ensureEdition() {
  if (g.bgccEdition) return;
  const rows = await client<{ edition: string }[]>`select edition from public.settings where id = 1`.catch(() => null);
  if (rows) g.bgccEdition = rows[0]?.edition === "bgcc7" ? "bgcc7" : "bgcc6";
}

export const db: typeof db6 = new Proxy(db6, {
  get(_, k) {
    const d = currentEdition() === "bgcc7" ? db7 : db6;
    const v = Reflect.get(d, k, d);
    return typeof v === "function" ? v.bind(d) : v;
  },
});
