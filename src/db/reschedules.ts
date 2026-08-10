import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { reschedules, users } from "./schema";
import { safe } from "./safe";

export type Reschedule = {
  id: number;
  matchId: string;
  teamId: string;
  requestedBy: number;
  requester: string | null;
  proposedAt: Date;
  reason: string | null;
  status: "pending" | "accepted" | "declined" | "approved" | "denied" | "cancelled";
  createdAt: Date;
};

export const OPEN = ["pending", "accepted"];

export const getReschedules = () =>
  safe(
    async () =>
      (await db
        .select({
          id: reschedules.id,
          matchId: reschedules.matchId,
          teamId: reschedules.teamId,
          requestedBy: reschedules.requestedBy,
          requester: users.username,
          proposedAt: reschedules.proposedAt,
          reason: reschedules.reason,
          status: reschedules.status,
          createdAt: reschedules.createdAt,
        })
        .from(reschedules)
        .leftJoin(users, eq(users.osuId, reschedules.requestedBy))
        .orderBy(desc(reschedules.id))) as Reschedule[],
    [] as Reschedule[],
  );
