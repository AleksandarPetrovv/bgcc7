import type { LogRow } from "@/db/admin";
import { TZ } from "@/lib/time";

type Category = "refereed" | "poolWork" | "ratings" | "screening" | "qualifierScores" | "matchScores";
type Scope = { category: Category; context: string; key: string };
export type CompactLogEntry = { kind: "row"; row: LogRow } | { kind: "group"; category: Category; context: string; latest: LogRow; rows: LogRow[] };

const refereeActions = new Set([
  "lobby.make", "lobby.chat", "lobby.invite", "lobby.start", "lobby.abort", "lobby.close",
  "lobby.aborttimer", "lobby.kick", "lobby.spare", "lobby.team", "lobby.move", "lobby.cmd", "lobby.refresh",
  "draft.open", "draft.close", "draft.pause", "draft.resume", "draft.end", "draft.reset", "draft.undo", "draft.redo",
]);
const poolActions = new Set(["pool.suggest", "pool.unsuggest", "map.add", "map.move"]);
const qualifierActions = new Set(["qual.setScore", "qual.deleteScore", "qual.clearPlayer"]);
const scoreActions = new Set(["match.score.save", "match.score.remove", "match.score.undo"]);
const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const inactivity = 60 * 60 * 1000;

function payload(row: LogRow): Record<string, unknown> {
  return row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {};
}

function id(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function scope(row: LogRow): Scope | null {
  const p = payload(row);
  const match = id(p.matchId);
  const stage = id(p.stageId);
  const player = id(p.osuId);
  const scoped = (category: Category, context: string, parts: unknown[] = [context]): Scope => ({ category, context, key: JSON.stringify([category, ...parts]) });
  if (refereeActions.has(row.action) && match) return scoped("refereed", match);
  if (poolActions.has(row.action) && stage) return scoped("poolWork", stage);
  if (row.action === "pool.vote") {
    const suggestion = id(p.id);
    if (stage) return scoped("ratings", stage, ["stage", stage]);
    if (suggestion) return scoped("ratings", "suggestions", ["suggestions"]);
  }
  if (row.action === "screening.decide" && player && ["approved", "denied", "pending"].includes(String(p.status))) {
    return scoped("screening", String(p.status));
  }
  if (qualifierActions.has(row.action) && player) {
    return scoped("qualifierScores", player, [player, id(p.lobbyId), match]);
  }
  if (scoreActions.has(row.action) && match && player) return scoped("matchScores", match, [match, player]);
  return null;
}

export function compactLog(rows: readonly LogRow[]): CompactLogEntry[] {
  type Batch = { scope: Scope; rows: LogRow[]; lastAt: number; day: string };
  type Session = { generation: number; made: boolean; closed: boolean; ended: boolean; lastAt: number; day: string };
  const active = new Map<string, Batch>();
  const sessions = new Map<string, Session>();
  const batches: Batch[] = [];
  const entries: CompactLogEntry[] = [];
  let boundary = 0;
  const ordered = rows.map((row, index) => ({ row, index })).sort((a, b) => a.row.at.getTime() - b.row.at.getTime() || a.row.id - b.row.id || a.index - b.index);

  for (const { row } of ordered) {
    if (row.action === "edition.switch") {
      boundary += 1;
      active.clear();
      sessions.clear();
      entries.push({ kind: "row", row });
      continue;
    }
    const p = payload(row);
    const tagged = Object.prototype.hasOwnProperty.call(p, "_edition");
    const edition = tagged ? p._edition : null;
    const validEdition = !tagged || (typeof edition === "string" && edition.trim().length > 0);
    const at = row.at.getTime();
    const s = validEdition && Number.isFinite(at) && Number.isSafeInteger(row.osuId) && row.osuId > 0 ? scope(row) : null;
    if (!s) {
      entries.push({ kind: "row", row });
      continue;
    }
    const day = dayFormat.format(row.at);
    let generation = 0;
    if (s.category === "refereed") {
      const sessionKey = JSON.stringify([boundary, edition, s.context]);
      let session = sessions.get(sessionKey);
      const startsAgain = session && (session.closed || (row.action === "lobby.make" && session.made) || ((row.action === "draft.open" || row.action === "draft.reset") && session.ended && !session.made));
      if (!session || startsAgain || session.day !== day || at - session.lastAt > inactivity) {
        session = { generation: (session?.generation ?? 0) + 1, made: false, closed: false, ended: false, lastAt: at, day };
        sessions.set(sessionKey, session);
      }
      session.lastAt = at;
      if (row.action === "lobby.make") session.made = true;
      if (row.action === "lobby.close") session.closed = true;
      if (row.action === "draft.end") session.ended = true;
      if (row.action === "draft.open" || row.action === "draft.reset") session.ended = false;
      generation = session.generation;
    }
    const key = JSON.stringify([boundary, edition, row.osuId, s.key, generation]);
    let batch = active.get(key);
    if (!batch || batch.day !== day || at - batch.lastAt > inactivity) {
      batch = { scope: s, rows: [], lastAt: at, day };
      active.set(key, batch);
      batches.push(batch);
    }
    batch.rows.push(row);
    batch.lastAt = at;
  }

  for (const batch of batches) {
    const children = batch.rows.slice().reverse();
    const latest = children[0];
    if (children.length < 2) entries.push({ kind: "row", row: latest });
    else entries.push({ kind: "group", category: batch.scope.category, context: batch.scope.context, latest, rows: children });
  }
  const latest = (entry: CompactLogEntry) => entry.kind === "row" ? entry.row : entry.latest;
  return entries.sort((a, b) => latest(b).at.getTime() - latest(a).at.getTime() || latest(b).id - latest(a).id);
}
