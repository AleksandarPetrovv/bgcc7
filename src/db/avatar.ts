import { sql } from "drizzle-orm";
import { users } from "./schema";
import { avatarPath } from "@/lib/avatar";

export const avatarCol = sql<string | null>`case when ${users.avatarUrl} is null then null else ${avatarPath("")} || ${users.osuId} end`;
