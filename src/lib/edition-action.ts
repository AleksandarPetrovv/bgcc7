"use server";

import { cookies } from "next/headers";
import { EDITION_COOKIE } from "@/db";
import { isEdition } from "@/lib/format";

export async function viewEdition(edition: string) {
  if (!isEdition(edition)) return;
  (await cookies()).set(EDITION_COOKIE, edition, { path: "/", maxAge: 60 * 60 * 6, sameSite: "lax" });
}
