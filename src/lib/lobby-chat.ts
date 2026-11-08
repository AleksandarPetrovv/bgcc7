import type { mpChat } from "@/db/schema";

export type ChatLine = { id?: number; at: number; from: string; text: string; ref?: boolean; local?: boolean; side?: 1 | 2 };

export const CHAT_KEEP = 150;
export const CHAT_SHOWN = 100;

export const CHAT_GAP = 1500;

export const cleanChat = (raw: string) => raw.replace(/[\r\n]+/g, " ").trim().slice(0, 300);

export const chatLine = (r: typeof mpChat.$inferSelect): ChatLine => ({ id: r.id, at: r.at.getTime(), from: r.from, text: r.text, ...(r.local ? { local: true } : {}), ...(r.side === 1 || r.side === 2 ? { side: r.side } : {}) });
