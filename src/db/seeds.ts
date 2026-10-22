import "server-only";
import { cache } from "react";
import { getRegistrations } from "./registrations";
import { getQualResults } from "./qualifiers";
import { rankBws } from "@/lib/bws";
import { isBGCC6 } from "./index";

export const getPlayerSeeds = cache(async (): Promise<Map<number, number>> => {
  if (!isBGCC6()) {
    const ranked = rankBws((await getRegistrations()).filter((r) => r.status === "approved")).filter((p) => p.bws !== null);
    return new Map(ranked.map((p, i) => [p.osuId, i + 1]));
  }
  const { players } = await getQualResults();
  return new Map(players.map((p, i) => [p.id, i + 1]));
});
