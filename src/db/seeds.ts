import "server-only";
import { cache } from "react";
import { getRegistrations } from "./registrations";
import { getQualResults } from "./qualifiers";
import { rankBws } from "@/lib/bws";
import { eq } from "drizzle-orm";
import { db, isBGCC6 } from "./index";
import { settings } from "./schema";

/** the drawn players' ids in seed order; empty until the draw has started */
export const frozenSeeds = async () =>
  (isBGCC6() ? undefined : (await db.select({ draw: settings.draw }).from(settings).where(eq(settings.id, 1)).limit(1))[0]?.draw?.frozen) ?? [];

/** approved players best bws first; players without a rank are left out */
export const bwsRanking = cache(async () => {
  const ranked = rankBws(await getRegistrations()).filter((p) => p.bws !== null);
  const live = ranked.filter((r) => r.status === "approved");
  // once the draw has started its players keep their order, whatever screening does afterwards
  const frozen = await frozenSeeds();
  if (!frozen.length) return live;
  return [...frozen.flatMap((id) => ranked.find((p) => p.osuId === id) ?? []), ...live.filter((p) => !frozen.includes(p.osuId))];
});

export const getPlayerSeeds = cache(async (): Promise<Map<number, number>> => {
  if (!isBGCC6()) return new Map((await bwsRanking()).map((p, i) => [p.osuId, i + 1]));
  const { players } = await getQualResults();
  return new Map(players.map((p, i) => [p.id, i + 1]));
});
