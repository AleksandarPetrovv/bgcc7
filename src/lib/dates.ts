export type TimelineRow = { key: string; from: string | null; to: string | null };

const TZ = "Europe/Sofia";

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

export const sofiaDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

export type TimelineState = "done" | "now" | "next";

export function timelineStates(rows: TimelineRow[], today = sofiaDate(new Date())): TimelineState[] {
  return rows.map((r) => (!r.from || today < r.from ? "next" : today > (r.to ?? r.from) ? "done" : "now"));
}

export function fmtRange(locale: string, from: string | null, to: string | null) {
  if (!from) return "";
  const a = day(from);
  const md = (d: Date) => d.toLocaleDateString(locale, { timeZone: "UTC", day: "numeric", month: "short" });
  if (!to || to === from) return md(a);
  const b = day(to);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${md(b)}`;
  return `${md(a)} – ${md(b)}`;
}

export const fill = (text: string, tokens: Record<string, string>) => text.replace(/%([\w.-]+)%/g, (m, k) => tokens[k] ?? m);

export function buildTokens(opts: {
  locale: string;
  timeline: TimelineRow[];
  regClosesAt: Date | null;
  qualifyCount: number;
  firstTo: Record<string, number | null>;
}) {
  const { locale, timeline, regClosesAt, qualifyCount, firstTo } = opts;
  const tokens: Record<string, string> = {};
  for (const r of timeline) tokens[r.key] = fmtRange(locale, r.from, r.to);
  tokens.regOpen = fmtRange(locale, timeline.find((r) => r.key === "reg")?.from ?? null, null);
  if (regClosesAt) {
    tokens.regClose = regClosesAt.toLocaleDateString(locale, { timeZone: TZ, day: "numeric", month: "long" });
    tokens.regCloseTime = `${regClosesAt.toLocaleString(locale, { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} EET`;
  }
  tokens.qualify = String(qualifyCount);
  tokens.teams = String(Math.floor(qualifyCount / 3));
  for (const [slug, ft] of Object.entries(firstTo)) if (ft) tokens[`bo.${slug}`] = String(ft * 2 - 1);
  return tokens;
}

const PHASE_KEY: Record<string, string> = { registration: "reg", screening: "scr", qualifiers: "qual", seeding: "seed", playoffs: "play", finished: "done" };

export function phaseStates(rows: TimelineRow[], phase: string): TimelineState[] {
  const at = rows.findIndex((r) => r.key === PHASE_KEY[phase]);
  if (at < 0) return timelineStates(rows);
  return rows.map((_, i) => (i < at ? "done" : i === at ? "now" : "next"));
}
