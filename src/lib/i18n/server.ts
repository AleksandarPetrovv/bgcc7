import { cookies } from "next/headers";
import type { Lang } from "./dict";
import { dictFor } from "./dict7";
import { getEdition } from "@/db/edition";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "bg" ? "bg" : "en";
}

export async function getDict() {
  return dictFor(await getLang(), getEdition());
}
