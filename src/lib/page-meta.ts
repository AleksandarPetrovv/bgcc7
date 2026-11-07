import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";

/** a page's own search title + one-line description; the root layout adds " · BGCC7" */
export const pageMeta = (key: keyof Dict["meta"]["pages"]) => async (): Promise<Metadata> => {
  const [title, description] = (await getDict()).meta.pages[key];
  return { title, description };
};
