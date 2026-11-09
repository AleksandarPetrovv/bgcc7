"use server";

import { saveSettings } from "@/db/settings";
import { guard } from "@/lib/admin-action";
import { cleanPlan, DEFAULT_PLAN, type Plan } from "@/lib/format-plan";
import { syncStages } from "@/db/format-plan";

async function store(plan: Plan) {
  await saveSettings({ formatPlan: plan });
  await syncStages(plan);
}

export async function savePlan(input: unknown) {
  return guard("host", "format.save", async () => {
    const plan = cleanPlan(input);
    if (!plan) return { ok: false, error: "invalid" };
    await store(plan);
    return { log: { rounds: plan.rounds.length } };
  });
}

export async function resetPlan() {
  return guard("host", "format.reset", async () => {
    await store(DEFAULT_PLAN);
    return { log: { rounds: DEFAULT_PLAN.rounds.length } };
  });
}
