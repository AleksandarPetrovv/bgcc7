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

export function fromSofiaInput(s: string | null | undefined) {
  if (!s) return null;
  const naive = new Date(`${s}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  const guess = new Date(naive.getTime() - offsetMs(naive));
  return new Date(naive.getTime() - offsetMs(guess));
}

export function toSofiaInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d.getTime() + offsetMs(d)).toISOString().slice(0, 16);
}

export function fmtSofia(d: Date, locale: string) {
  return d.toLocaleString(locale, { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export const isFuture = (d: Date | null | undefined) => !!d && d.getTime() > Date.now();
