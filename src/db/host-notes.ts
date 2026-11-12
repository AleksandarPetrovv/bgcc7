import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { hostNotes as notes } from "./schema";
import { getCfg } from "./discord-bot";
import { siteUrl } from "@/lib/links";
import { post } from "@/lib/discord";

export type HostNote = { id: number; title: string; lines: string[]; href: string };

/** `pingRole` is a discord role id to mention in the hosts channel post */
export async function notifyHosts(n: { title: string; lines?: string[]; href: string; pingRole?: string }) {
  const lines = n.lines ?? [];
  await db.insert(notes).values({ title: n.title, lines, href: n.href });
  try {
    const { hosts } = await getCfg();
    if (hosts) await post(hosts, [`${n.pingRole ? `<@&${n.pingRole}> ` : ""}**${n.title}**`, ...lines, `${siteUrl()}${n.href}`].join("\n"), n.pingRole ? { mentions: { roles: [n.pingRole] } } : undefined);
  } catch (e) {
    console.error("[discord] host note", e);
  }
}

export const hostNotes = (osuId: number): Promise<HostNote[]> =>
  db
    .select({ id: notes.id, title: notes.title, lines: notes.lines, href: notes.href })
    .from(notes)
    .where(sql`not (${osuId} = any(${notes.seenBy}))`)
    .orderBy(desc(notes.at), desc(notes.id))
    .limit(20);

export const seeHostNote = (id: number, osuId: number) =>
  db
    .update(notes)
    .set({ seenBy: sql`array_append(${notes.seenBy}, ${osuId})` })
    .where(eq(notes.id, id));
