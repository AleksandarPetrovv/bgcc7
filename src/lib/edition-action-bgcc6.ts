"use server";

import { cookies } from "next/headers";
import { EDITION_COOKIE } from "@/db";
import { isEdition } from "@/lib/format";
import { VIEW_COOKIE_AGE } from "@/lib/i18n/locale";

export async function viewEdition(edition: string) {
  if (!isEdition(edition)) return;
  (await cookies()).set(EDITION_COOKIE, edition, { path: "/", maxAge: VIEW_COOKIE_AGE, sameSite: "lax" });
}
