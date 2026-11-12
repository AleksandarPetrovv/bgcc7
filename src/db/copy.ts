import "server-only";
import { cache } from "react";
import { getSettings } from "./settings";
import { getFormat } from "./edition";
import { getPoolStages } from "./mappools";
import { getSkillLayouts } from "./format-plan";
import { getDict, getLang } from "@/lib/i18n/server";
import { matchWeeks, weekCloses } from "./schedule";
import { buildTokens, fill } from "@/lib/dates";
import { isBGCC6 } from "./index";
import { localeOf } from "@/lib/i18n/locale";

const getTokens = cache(async () => {
  const [s, stages, lang, t, skills, weeks, closes] = await Promise.all([getSettings(), getPoolStages(), getLang(), getDict(), getSkillLayouts(), matchWeeks(), weekCloses()]);
  return buildTokens({
    weeks,
    closes,
    weekTitle: t.sched.admin.weekTitle,
    locale: localeOf(lang),
    timeline: s.timeline,
    regClosesAt: s.regClosesAt,
    qualifyCount: s.qualifyCount,
    teams: isBGCC6() ? undefined : getFormat().teams,
    firstTo: Object.fromEntries(stages.map((x) => [x.slug, x.firstTo])),
    format: getFormat(),
    bans: Object.fromEntries(Object.entries(skills ?? {}).map(([slug, l]) => [slug, l.bans])),
  });
});

export async function getFill() {
  const tokens = await getTokens();
  return (text: string) => fill(text, tokens);
}
