import { localeOf } from "./i18n/locale";

const TZ = "Europe/Sofia";

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

/** every shown date goes through here: Sofia time, and "Sep" where en-GB writes "Sept" */
export const fmtDate = (d: Date, locale: string, o: Intl.DateTimeFormatOptions, timeZone = TZ) => d.toLocaleString(locale, { timeZone, ...o }).replace("Sept", "Sep");

export const fmtSofia = (d: Date, locale: string) => fmtDate(d, locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const sofiaDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** a calendar day ("2027-09-18", or a datetime-local value) at noon UTC, so it is that day in every timezone */
export const dayDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

export const addDays = (iso: string, n: number) => {
  const d = dayDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const isFuture = (d: Date | null | undefined) => !!d && d.getTime() > Date.now();

export type WindowState = "soon" | "open" | "closed";
export const windowState = (opens: Date | null, closes: Date | null): WindowState => {
  const now = Date.now();
  if (opens && now < opens.getTime()) return "soon";
  if (closes && now >= closes.getTime()) return "closed";
  return "open";
};

export const fmtSofiaDay = (d: Date, locale: string) => fmtDate(d, locale, { weekday: "short", day: "numeric", month: "short" });
export const dayFmt = (date: string, lang: string, o: Intl.DateTimeFormatOptions) => fmtDate(dayDate(date), localeOf(lang), o, "UTC").replace(".", "");
export const dayHead = (date: string, lang: string) => {
  const n = +date.slice(8, 10);
  const [m, w] = [dayFmt(date, lang, { month: "short" }), dayFmt(date, lang, { weekday: "short" })];
  return lang === "bg" ? `${n} ${m}, ${w}` : `${m} ${n}, ${w}`;
};
export const dayMonth = (date: string, lang: string) => `${+date.slice(8, 10)} ${dayFmt(date, lang, { month: "short" })}`;
export const dayTime = (v: string, lang: string, weekday: "long" | "short" = "long") => `${dayMonth(v, lang)}, ${dayFmt(v, lang, { weekday })}, ${v.slice(11, 16)}`;
export const fmtSofiaTime =(d: Date) => d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** everything written out, Sofia time: "Saturday, 15 November, 18:00" */
export const fullDayTime = (d: Date, lang: string) => {
  const v = `${sofiaDate(d)}T${fmtSofiaTime(d)}`;
  return `${dayFmt(v, lang, { weekday: "long" })}, ${+v.slice(8, 10)} ${dayFmt(v, lang, { month: "long" })}, ${v.slice(11, 16)}`;
};
export const nextHour = () => new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000);
