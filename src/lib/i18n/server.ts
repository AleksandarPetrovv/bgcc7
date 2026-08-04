import { cookies } from "next/headers";
import { dicts, type Lang } from "./dict";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "bg" ? "bg" : "en";
}

export async function getDict() {
  return dicts[await getLang()];
}
