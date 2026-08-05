import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const g = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const client = g.pg ?? postgres(process.env.DATABASE_URL ?? "postgres://unset@127.0.0.1:1/unset", { max: 10 });
if (process.env.NODE_ENV !== "production") g.pg = client;

export const db = drizzle(client, { schema });
