"use server";

import { cookies } from "next/headers";
import type { Lang } from "./dict";

export async function setLang(lang: Lang) {
  (await cookies()).set("lang", lang === "bg" ? "bg" : "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
