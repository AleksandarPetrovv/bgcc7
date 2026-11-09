import { sql } from "drizzle-orm";
import { users } from "./schema";
import { avatarPath } from "@/lib/avatar";

// the osu! avatar stamp (?123) rides along so browsers refetch when the picture behind an id changes
export const avatarCol = sql<string | null>`case when ${users.avatarUrl} is null then null else ${avatarPath("")} || ${users.osuId} || coalesce('?v=' || nullif(split_part(${users.avatarUrl}, '?', 2), ''), '') end`;
