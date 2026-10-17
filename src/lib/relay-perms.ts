import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { can, cleanRoles } from "./roles";

export async function relayPerms(osuId: number) {
  const [row] = await db.select({ roles: staff.permRoles }).from(staff).where(eq(staff.osuId, osuId)).limit(1);
  const roles = cleanRoles(row?.roles ?? []);
  return { ref: can(roles, "matches"), stream: can(roles, "overlay") };
}
