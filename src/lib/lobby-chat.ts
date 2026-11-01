import type { mpChat } from "@/db/schema";

export type ChatLine = { id?: number; at: number; from: string; text: string; ref?: boolean; local?: boolean; side?: 1 | 2 };

// lines a live lobby keeps in memory, also what a restore reloads from the db
export const CHAT_KEEP = 150;
// lines a lobby view sends; older ones come from the paged chat history
export const CHAT_SHOWN = 100;

// one chat message per person this often, on the site and in the lobby box
export const CHAT_GAP = 1500;

export const cleanChat = (raw: string) => raw.replace(/[\r\n]+/g, " ").trim().slice(0, 300);

export const chatLine = (r: typeof mpChat.$inferSelect): ChatLine => ({ id: r.id, at: r.at.getTime(), from: r.from, text: r.text, ...(r.local ? { local: true } : {}), ...(r.side === 1 || r.side === 2 ? { side: r.side } : {}) });
