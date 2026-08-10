import "server-only";
import { cache } from "react";
import { getSettings } from "./settings";
import { getPoolStages } from "./mappools";
import { getLang } from "@/lib/i18n/server";
import { buildTokens, fill } from "@/lib/dates";

export const getTokens = cache(async () => {
  const [s, stages, lang] = await Promise.all([getSettings(), getPoolStages(), getLang()]);
  return buildTokens({
    locale: lang === "bg" ? "bg-BG" : "en-GB",
    timeline: s.timeline,
    regClosesAt: s.regClosesAt,
    qualifyCount: s.qualifyCount,
    firstTo: Object.fromEntries(stages.map((x) => [x.slug, x.firstTo])),
  });
});

export async function getFill() {
  const tokens = await getTokens();
  return (text: string) => fill(text, tokens);
}
