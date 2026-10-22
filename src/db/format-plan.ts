import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, isBGCC6 } from "./index";
import { settings, stages } from "./schema";
import { safe } from "./safe";
import { cleanPlan, DEFAULT_PLAN, skillLayout, type Plan } from "@/lib/format-plan";

export const getPlan = cache(() =>
  safe(async () => {
    const [row] = await db.select({ plan: settings.formatPlan }).from(settings).where(eq(settings.id, 1)).limit(1);
    return cleanPlan(row?.plan) ?? DEFAULT_PLAN;
  }, DEFAULT_PLAN as Plan),
);

export const getSkillLayouts = cache(async () => {
  if (isBGCC6()) return null;
  const plan = await getPlan();
  return Object.fromEntries(plan.rounds.map((r) => [r.slug, skillLayout(plan, r.slug)!]));
});

export async function syncStages(plan: Plan) {
  if (isBGCC6()) return;
  for (const r of plan.rounds) {
    const l = skillLayout(plan, r.slug);
    if (l) await db.update(stages).set({ blueprint: l.blueprint, firstTo: l.firstTo }).where(eq(stages.slug, r.slug));
  }
}
