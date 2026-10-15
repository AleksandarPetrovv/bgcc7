import type { ChatLine } from "@/lib/bancho";
import type { ChatHistoryPage } from "@/lib/chat-history";

export type ChatEntry = ChatLine & { key: string };

export const chatIdentity = (line: ChatLine) => JSON.stringify([line.at, line.from, line.text, !!line.local, line.side ?? null]);

const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export function isChatHistoryPage(value: unknown): value is ChatHistoryPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Record<string, unknown>;
  return (page.mpId === null || positiveId(page.mpId)) && (page.before === null || positiveId(page.before)) && typeof page.hasMore === "boolean" && Array.isArray(page.lines) && page.lines.every((value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const line = value as Record<string, unknown>;
    return typeof line.at === "number" && Number.isFinite(line.at) && typeof line.from === "string" && typeof line.text === "string" && (line.id === undefined || positiveId(line.id)) && (line.ref === undefined || typeof line.ref === "boolean") && (line.local === undefined || typeof line.local === "boolean") && (line.side === undefined || line.side === 1 || line.side === 2);
  });
}

export function chatOverlaps(a: ChatLine[], b: ChatLine[]) {
  const ids = new Set(a.flatMap((line) => line.id == null ? [] : [line.id]));
  const identities = new Set(a.map(chatIdentity));
  const unpersisted = new Set(a.filter((line) => line.id == null).map(chatIdentity));
  return b.some((line) => (line.id != null && ids.has(line.id)) || (line.id == null ? identities : unpersisted).has(chatIdentity(line)));
}

export function mergeChatLines(current: ChatEntry[], incoming: ChatLine[]): ChatEntry[] {
  const merged = [...current];
  const ids = new Map<number, number>();
  const identities = new Map<string, number[]>();
  const index = (line: ChatEntry, i: number) => {
    if (line.id != null) ids.set(line.id, i);
    const identity = chatIdentity(line);
    identities.set(identity, [...(identities.get(identity) ?? []), i]);
  };
  merged.forEach(index);
  for (const line of incoming) {
    const identity = chatIdentity(line);
    const i = (line.id == null ? undefined : ids.get(line.id)) ?? identities.get(identity)?.find((i) => line.id == null || merged[i].id == null || merged[i].id === line.id);
    if (i == null) {
      const entry = { ...line, key: line.id == null ? `live:${identity}` : `id:${line.id}` };
      index(entry, merged.length);
      merged.push(entry);
    } else {
      const entry = { ...merged[i], ...line, key: merged[i].key };
      if (Object.keys(entry).some((key) => entry[key as keyof ChatEntry] !== merged[i][key as keyof ChatEntry])) merged[i] = entry;
      if (entry.id != null) ids.set(entry.id, i);
    }
  }
  merged.sort((a, b) => a.at - b.at || (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER));
  return merged.length === current.length && merged.every((line, i) => line === current[i]) ? current : merged;
}
