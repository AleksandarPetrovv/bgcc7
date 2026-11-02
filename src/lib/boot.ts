import { createHash } from "node:crypto";
import type { Edition } from "./format";

// shared by instrumentation.ts (before the app modules load), db/index.ts and the tick route, so it imports nothing of the app

/** the edition stored in public.settings; anything unknown is the current one */
export const normEdition = (v: unknown): Edition => (v === "bgcc6" ? "bgcc6" : "bgcc7");

/** the header value that proves a /api/discord/tick call came from inside the container */
export const tickKey = (secret: string) => createHash("sha256").update(`discord-tick:${secret}`).digest("hex");
