import "server-only";
import { cache } from "react";
import { getRegistrations } from "./registrations";
import { getQualResults } from "./qualifiers";
import { rankBws } from "@/lib/bws";
import { isBGCC6 } from "./index";

/** approved players best bws first; players without a rank are left out */
export const bwsRanking = cache(async () => rankBws((await getRegistrations()).filter((r) => r.status === "approved")).filter((p) => p.bws !== null));

export const getPlayerSeeds = cache(async (): Promise<Map<number, number>> => {
  if (!isBGCC6()) return new Map((await bwsRanking()).map((p, i) => [p.osuId, i + 1]));
  const { players } = await getQualResults();
  return new Map(players.map((p, i) => [p.id, i + 1]));
});
