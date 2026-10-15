import "server-only";
import { cache } from "react";
import { getFormat } from "./edition";
import { getRegistrations } from "./registrations";
import { getQualResults } from "./qualifiers";
import { rankBws } from "@/lib/bws";

export const getPlayerSeeds = cache(async (): Promise<Map<number, number>> => {
  if (getFormat().edition === "bgcc7") {
    const ranked = rankBws((await getRegistrations()).filter((r) => r.status === "approved")).filter((p) => p.bws !== null);
    return new Map(ranked.map((p, i) => [p.osuId, i + 1]));
  }
  const { players } = await getQualResults();
  return new Map(players.map((p, i) => [p.id, i + 1]));
});
