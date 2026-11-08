import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { mpLobbies } from "./schema";
import { staffIds } from "./users";
import { relayOnline } from "@/lib/relay";

export async function siteRun(m: { id: string; referee: string | null }) {
  const refs = await staffIds(m.referee);
  const [lob] = await db.select({ owner: mpLobbies.owner, open: mpLobbies.open }).from(mpLobbies).where(eq(mpLobbies.matchId, m.id)).limit(1);
  const refLive = refs.some((ref) => relayOnline(ref) || (!!lob?.open && lob.owner === String(ref)));
  return { refs, refLive, onSite: refLive || !!lob };
}
