import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { settings } from "./schema";
import { safe } from "./safe";
import { DEFAULT_TIMELINE, PHASES, presetSections, TIMELINE_KEYS, type Phase, type Section } from "@/lib/sections";
import { sofiaDate, type TimelineRow } from "@/lib/dates";

export type Settings = {
  phase: Phase;
  sections: Record<Section, boolean>;
  regOpensAt: Date | null;
  regClosesAt: Date | null;
  bookingOpensAt: Date | null;
  bookingClosesAt: Date | null;
  pickemsOpen: boolean;
  timeline: TimelineRow[];
  qualifyCount: number;
  ezMult: number;
  phasePrompts: Record<string, string>;
  links: Record<string, string>;
};

export const DEFAULT_SETTINGS: Settings = {
  phase: "registration",
  sections: presetSections("registration"),
  regOpensAt: new Date("2027-11-02T00:00:00+02:00"),
  regClosesAt: new Date("2027-11-22T23:59:00+02:00"),
  bookingOpensAt: new Date("2027-11-23T00:00:00+02:00"),
  bookingClosesAt: new Date("2027-11-27T23:59:00+02:00"),
  pickemsOpen: false,
  timeline: DEFAULT_TIMELINE,
  qualifyCount: 24,
  ezMult: 1.8,
  phasePrompts: {},
  links: {},
};

function withReg(stored: { key: string; from?: string | null; to?: string | null }[], opens: Date | null, closes: Date | null): TimelineRow[] {
  return TIMELINE_KEYS.map((key) => {
    if (key === "reg") return { key, from: opens ? sofiaDate(opens) : null, to: closes ? sofiaDate(closes) : null };
    const old = (k: string) => stored.find((r) => r.key === k);
    const legacy =
      key === "play" && old("qf") ? { key, from: old("qf")?.from ?? null, to: old("gf")?.to ?? old("gf")?.from ?? null } : undefined;
    const s = stored.find((r) => r.key === key) ?? legacy;
    const d = DEFAULT_TIMELINE.find((r) => r.key === key)!;
    return s && "from" in s ? { key, from: s.from ?? null, to: s.to ?? null } : { key, from: d.from, to: d.to };
  });
}

export const getSettings = cache(() =>
  safe(async (): Promise<Settings> => {
    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    if (!row) return DEFAULT_SETTINGS;
    const phase = (PHASES as readonly string[]).includes(row.phase) ? (row.phase as Phase) : DEFAULT_SETTINGS.phase;
    return {
      phase,
      sections: { ...presetSections(phase), ...row.sections },
      regOpensAt: row.regOpensAt,
      regClosesAt: row.regClosesAt,
      bookingOpensAt: row.bookingOpensAt,
      bookingClosesAt: row.bookingClosesAt,
      pickemsOpen: row.pickemsOpen,
      timeline: withReg(row.timeline, row.regOpensAt, row.regClosesAt),
      qualifyCount: row.qualifyCount,
      ezMult: row.ezMult,
      phasePrompts: row.phasePrompts ?? {},
      links: row.links ?? {},
    };
  }, DEFAULT_SETTINGS),
);

export async function saveSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch, updatedAt: new Date() };
  await db
    .insert(settings)
    .values({ id: 1, ...next })
    .onConflictDoUpdate({ target: settings.id, set: next });
}
