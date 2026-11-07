export type Lang = "en" | "bg";
export const LANGS: Lang[] = ["en", "bg"];

export const localeOf = (lang: string) => (lang === "bg" ? "bg-BG" : "en-GB");

export const LANG_COOKIE = "lang";
export const THEME_COOKIE = "theme";
/** lang + edition view cookies are per-visit, they reset after 6h */
export const VIEW_COOKIE_AGE = 60 * 60 * 6;
