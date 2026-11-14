import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { mpChat, mpLobbies } from "@/db/schema";
import { lobbyRefNames } from "./bancho";
import { chatLine, type ChatLine } from "./lobby-chat";
import { visibleChatLine } from "./chat-visibility";
import { flagChat } from "./chat-filter";
import { nameKey } from "@/lib/names";

export type ChatHistoryPage = { mpId: number | null; lines: ChatLine[]; before: number | null; hasMore: boolean };

const PAGE_SIZE = 100;

export async function lobbyChatHistory(matchId: string, admin: boolean, before?: number): Promise<ChatHistoryPage> {
  const [lobby] = await db.select({ mpId: mpLobbies.mpId }).from(mpLobbies).where(eq(mpLobbies.matchId, matchId)).limit(1);
  if (!lobby) return { mpId: null, lines: [], before: null, hasMore: false };

  const rows = await db
    .select()
    .from(mpChat)
    .where(and(eq(mpChat.matchId, matchId), eq(mpChat.mpId, lobby.mpId), before === undefined ? undefined : lt(mpChat.id, before)))
    .orderBy(desc(mpChat.id))
    .limit(PAGE_SIZE + 1);
  const refs = await lobbyRefNames();
  const page = rows.slice(0, PAGE_SIZE);
  const lines = page.map<ChatLine>((row) => ({ ...chatLine(row), ...(refs.has(nameKey(row.from)) ? { ref: true } : {}) })).reverse();

  return {
    mpId: lobby.mpId,
    lines: flagChat(admin ? lines : lines.filter(visibleChatLine)),
    before: page.at(-1)?.id ?? null,
    hasMore: rows.length > PAGE_SIZE,
  };
}
