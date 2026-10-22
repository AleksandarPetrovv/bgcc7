import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { currentEdition, db, ensureEdition } from "./index";
import { settings } from "./schema";
import { safe } from "./safe";
import { DEFAULT_TIMELINE, PHASES, presetSections, TIMELINE_KEYS, type Phase, type Section } from "@/lib/sections";
import { sofiaDate, type TimelineRow } from "@/lib/dates";
import { fromSofiaInput } from "@/lib/time";
import type { Edition } from "@/lib/format";

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
  phasePrompts: Record<string, string>;
  links: Record<string, string>;
  bans: number;
  banOrder: BanOrder;
  banSecs: number;
  pickSecs: number;
  timeoutSecs: number;
  edition: Edition;
};

export type BanOrder = "abab" | "abba";

export const DEFAULT_SETTINGS: Settings = {
  phase: "registration",
  sections: presetSections("registration"),
  regOpensAt: fromSofiaInput("2027-11-02T00:00"),
  regClosesAt: fromSofiaInput("2027-11-22T23:59"),
  bookingOpensAt: fromSofiaInput("2027-11-23T00:00"),
  bookingClosesAt: fromSofiaInput("2027-11-27T23:59"),
  pickemsOpen: false,
  timeline: DEFAULT_TIMELINE,
  qualifyCount: 24,
  phasePrompts: {},
  links: {},
  bans: 2,
  banOrder: "abab",
  banSecs: 90,
  pickSecs: 120,
  timeoutSecs: 180,
  edition: "bgcc7",
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
    await ensureEdition();
    const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
    if (!row) return { ...DEFAULT_SETTINGS, edition: currentEdition() };
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
      phasePrompts: row.phasePrompts ?? {},
      links: row.links ?? {},
      bans: row.bans,
      banOrder: row.banOrder === "abba" ? "abba" : "abab",
      banSecs: row.banSecs,
      pickSecs: row.pickSecs,
      timeoutSecs: row.timeoutSecs,
      edition: currentEdition(),
    };
  }, DEFAULT_SETTINGS),
);

export async function saveSettings(patch: Partial<Settings>) {
  // edition is the site switch (admin/edition-bgcc6); only write the given fields so a failed read can't overwrite the row with defaults
  const set = { ...patch, edition: undefined, updatedAt: new Date() };
  await db
    .insert(settings)
    .values({ id: 1, ...(await getSettings()), ...set })
    .onConflictDoUpdate({ target: settings.id, set });
}
