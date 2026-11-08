import "server-only";
import { isBGCC6 } from "@/db";
import { getInfoCopy } from "@/db/info-copy";
import { getViewer } from "@/lib/authz";
import { getLang } from "@/lib/i18n/server";
import type { Role } from "@/lib/roles";

export const infoCopyKey = (lang: string, path: string) => `${lang}:${path}`;

/** hosts edit the bgcc7 rulebook in place; bgcc6 is an archive */
export const canEditInfo = (roles: readonly Role[] | null | undefined) => !isBGCC6() && !!roles?.includes("host");

export async function infoText() {
  const [copy, lang, viewer] = await Promise.all([getInfoCopy(), getLang(), getViewer()]);
  return { lang, on: canEditInfo(viewer?.roles), raw: (path: string, fallback: string) => copy[infoCopyKey(lang, path)] ?? fallback };
}
