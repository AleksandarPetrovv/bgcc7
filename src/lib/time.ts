export const TZ = "Europe/Sofia";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function offsetMs(at: Date) {
  const p = Object.fromEntries(fmt.formatToParts(at).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

export const tzLabel = (d: Date) => offsetMs(d) === 3 * 3_600_000 ? "EEST" : "EET";

export function fromSofiaInput(s: string | null | undefined) {
  if (!s || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(s)) return null;
  const wall = s.length === 16 ? `${s}:00` : s;
  const naive = new Date(`${wall}Z`);
  if (Number.isNaN(naive.getTime()) || naive.toISOString().slice(0, 19) !== wall) return null;
  const ms = naive.getTime();
  const offsets = new Set([-1, 0, 1].map((n) => offsetMs(new Date(ms + n * 86_400_000))));
  const candidates = [...offsets].map((offset) => ms - offset).filter((at) => at + offsetMs(new Date(at)) === ms);
  // reject spring gaps; pick the earlier occurrence of a repeated autumn time.
  return candidates.length ? new Date(Math.min(...candidates)) : null;
}

export function toSofiaInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d.getTime() + offsetMs(d)).toISOString().slice(0, 16);
}

export function fmtSofia(d: Date, locale: string) {
  return d.toLocaleString(locale, { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export const isFuture = (d: Date | null | undefined) => !!d && d.getTime() > Date.now();

export type WindowState = "soon" | "open" | "closed";
export const windowState = (opens: Date | null, closes: Date | null): WindowState => {
  const now = Date.now();
  if (opens && now < opens.getTime()) return "soon";
  if (closes && now >= closes.getTime()) return "closed";
  return "open";
};

export const fmtSofiaDay = (d: Date, locale: string) => d.toLocaleDateString(locale, { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
/** a date / datetime-local value's day, as written, no timezone shift */
export const dayFmt = (date: string, lang: string, o: Intl.DateTimeFormatOptions) => new Date(`${date.slice(0, 10)}T12:00Z`).toLocaleDateString(lang === "bg" ? "bg-BG" : "en-US", { timeZone: "UTC", ...o }).replace(".", "");
/** "Nov 1, Fri" / "1 ное, пт" from "2027-11-01" (a date or datetime-local value, as written) */
export const dayHead = (date: string, lang: string) => {
  const n = +date.slice(8, 10);
  const [m, w] = [dayFmt(date, lang, { month: "short" }), dayFmt(date, lang, { weekday: "short" })];
  return lang === "bg" ? `${n} ${m}, ${w}` : `${m} ${n}, ${w}`;
};
/** "10 Nov" / "10 ное" */
export const dayMonth = (date: string, lang: string) => `${+date.slice(8, 10)} ${dayFmt(date, lang, { month: "short" })}`;
/** "10 Nov, Tuesday, 11:11" from a datetime-local value ("2026-11-10T11:11") */
export const dayTime = (v: string, lang: string, weekday: "long" | "short" = "long") => `${dayMonth(v, lang)}, ${dayFmt(v, lang, { weekday })}, ${v.slice(11, 16)}`;
export const fmtSofiaTime =(d: Date) => d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const nextHour = () => new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
