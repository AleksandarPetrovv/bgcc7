"use server";

import { cookies } from "next/headers";
import type { Lang } from "./dict";
import { LANG_COOKIE, VIEW_COOKIE_AGE } from "./locale";

export async function setLang(lang: Lang) {
  (await cookies()).set(LANG_COOKIE, lang === "bg" ? "bg" : "en", { path: "/", maxAge: VIEW_COOKIE_AGE, sameSite: "lax" });
}
