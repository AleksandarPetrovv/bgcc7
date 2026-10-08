"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getSettings, saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import { cleanPlan, DEFAULT_PLAN, type Plan } from "@/lib/format-plan";
import { syncStages } from "@/db/format-plan";

async function store(plan: Plan) {
  const [row] = await db.select({ id: settings.id }).from(settings).where(eq(settings.id, 1)).limit(1);
  if (!row) await saveSettings(await getSettings());
  await db.update(settings).set({ formatPlan: plan }).where(eq(settings.id, 1));
  await syncStages(plan);
}

export async function savePlan(input: unknown) {
  return guard("settings", "format.save", async () => {
    const plan = cleanPlan(input);
    if (!plan) return { ok: false, error: "invalid" };
    await store(plan);
    return { rounds: plan.rounds.length };
  });
}

export async function resetPlan() {
  return guard("settings", "format.reset", async () => {
    await store(DEFAULT_PLAN);
    return { rounds: DEFAULT_PLAN.rounds.length };
  });
}
