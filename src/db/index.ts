import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { Edition } from "@/lib/format";

const url = process.env.DATABASE_URL ?? "postgres://unset@127.0.0.1:1/unset";
const g = globalThis as unknown as { pgBGCC6?: ReturnType<typeof postgres>; pg?: ReturnType<typeof postgres>; bgccEdition?: Edition; bgccPin?: AsyncLocalStorage<Edition | "site"> };
// bgcc6 lives in the public schema, the current edition in the bgcc7 schema
const clientBGCC6 = g.pgBGCC6 ?? postgres(url, { max: 10 });
const client = g.pg ?? postgres(url, { max: 6, connection: { search_path: "bgcc7,public" } });
if (process.env.NODE_ENV !== "production") {
  g.pgBGCC6 = clientBGCC6;
  g.pg = client;
}

export const dbBGCC6 = drizzle(clientBGCC6, { schema });
const base = drizzle(client, { schema });

export const EDITION_COOKIE = "edition";
const pin = (g.bgccPin ??= new AsyncLocalStorage<Edition | "site">());

export const siteEdition = (): Edition => g.bgccEdition ?? "bgcc7";

const viewEdition = (): Edition | null => {
  const store = workUnitAsyncStorage.getStore();
  if (store?.type !== "request") return null;
  const v = store.cookies.get(EDITION_COOKIE)?.value;
  return v === "bgcc6" || v === "bgcc7" ? v : null;
};

export const currentEdition = (): Edition => {
  const p = pin.getStore();
  if (p) return p === "site" ? siteEdition() : p;
  return viewEdition() ?? siteEdition();
};

/** the one check for "is this request about bgcc6". every bgcc6-only branch goes through it, so dropping bgcc6 = delete this and fix what stops compiling */
export const isBGCC6 = () => currentEdition() === "bgcc6";

export const withEdition = <T>(ed: Edition | "site", fn: () => T): T => pin.run(ed, fn);
export const setCurrentEdition = (e: Edition) => {
  g.bgccEdition = e;
};

export async function ensureEdition() {
  if (g.bgccEdition) return;
  const rows = await clientBGCC6<{ edition: string }[]>`select edition from public.settings where id = 1`.catch(() => null);
  if (rows) g.bgccEdition = rows[0]?.edition === "bgcc6" ? "bgcc6" : "bgcc7";
}

export const dbOf = (e: Edition) => (e === "bgcc6" ? dbBGCC6 : base);

export const db: typeof base = new Proxy(base, {
  get(_, k) {
    const d = dbOf(currentEdition());
    const v = Reflect.get(d, k, d);
    return typeof v === "function" ? v.bind(d) : v;
  },
});
