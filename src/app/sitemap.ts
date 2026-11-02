import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/links";
import { PUBLIC_PAGES } from "@/lib/sections";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  return PUBLIC_PAGES.map((p) => ({ url: `${site}${p === "/" ? "" : p}`, changeFrequency: "daily", priority: p === "/" ? 1 : 0.7 }));
}
