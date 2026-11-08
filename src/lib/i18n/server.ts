import { cookies } from "next/headers";
import type { Lang } from "./dict";
import { dictFor } from "./dict";
import { LANG_COOKIE } from "./locale";
import { currentEdition } from "@/db/edition-context";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return v === "bg" ? "bg" : "en";
}

export async function getDict() {
  return dictFor(await getLang(), currentEdition());
}
