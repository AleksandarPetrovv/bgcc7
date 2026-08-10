import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { settings } from "./schema";
import { safe } from "./safe";
import { DEFAULT_TIMELINE, PHASES, presetSections, type Phase, type Section } from "@/lib/sections";

export type Settings = {
  phase: Phase;
  sections: Record<Section, boolean>;
  regOpensAt: Date | null;
  regClosesAt: Date | null;
  bookingOpensAt: Date | null;
  bookingClosesAt: Date | null;
  pickemsOpen: boolean;
  timeline: { key: string; dates: string }[];
  timelineAt: string | null;
  qualifyCount: number;
  links: Record<string, string>;
};

export const DEFAULT_SETTINGS: Settings = {
  phase: "registration",
  sections: presetSections("registration"),
  regOpensAt: new Date("2026-11-02T00:00:00+02:00"),
  regClosesAt: new Date("2026-11-22T23:59:00+02:00"),
  bookingOpensAt: new Date("2026-11-23T00:00:00+02:00"),
  bookingClosesAt: new Date("2026-11-27T23:59:00+02:00"),
  pickemsOpen: false,
  timeline: DEFAULT_TIMELINE,
  timelineAt: "reg",
  qualifyCount: 24,
  links: {},
};

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
      timeline: row.timeline,
      timelineAt: row.timelineAt,
      qualifyCount: row.qualifyCount,
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
