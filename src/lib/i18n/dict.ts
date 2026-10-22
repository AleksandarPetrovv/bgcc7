import * as en from "./en";
import * as bg from "./bg";
import { dictsBGCC6 } from "./dict-bgcc6";
import type { Edition } from "@/lib/format";

export type Lang = "en" | "bg";
export const LANGS: Lang[] = ["en", "bg"];

const build = (d: typeof en) => ({ ...d.site, ...d.pages, ...d.match, ...d.schedule, admin: { ...d.adminSetup, ...d.adminPlay } });

export type Dict = ReturnType<typeof build>;

export const dicts: Record<Lang, Dict> = { en: build(en), bg: build(bg) };

const bgcc6 = dictsBGCC6(dicts);
export const dictFor = (lang: Lang, edition: Edition) => (edition === "bgcc6" ? bgcc6 : dicts)[lang];

export const roundName = (t: Dict, s: string) => t.rounds[s] ?? s;
