import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import type { Edition } from "./format";

// shared by instrumentation.ts (before the app modules load), db/index.ts and the tick route, so it imports nothing of the app

export const normEdition = (v: unknown): Edition => (v === "bgcc6" ? "bgcc6" : "bgcc7");

const slot = globalThis as unknown as { bgccEdition?: Edition };

export const bootedEdition = () => slot.bgccEdition;

/** reads the site edition from public.settings into the global; throws when the db is down */
export async function bootEdition(sql: Sql) {
  const [row] = await sql<{ edition: string }[]>`select edition from public.settings where id = 1`;
  slot.bgccEdition = normEdition(row?.edition);
}

/** the header value that proves a /api/discord/tick call came from inside the container */
export const tickKey = (secret: string) => createHash("sha256").update(`discord-tick:${secret}`).digest("hex");
