import * as en from "./en";
import * as bg from "./bg";

export type Lang = "en" | "bg";
export const LANGS: Lang[] = ["en", "bg"];

const build = (d: typeof en) => ({ ...d.site, ...d.pages, ...d.match, ...d.schedule, admin: { ...d.adminSetup, ...d.adminPlay } });

export type Dict = ReturnType<typeof build>;

export const dicts: Record<Lang, Dict> = { en: build(en), bg: build(bg) };

export const roundName = (t: Dict, s: string) => t.rounds[s] ?? s;
