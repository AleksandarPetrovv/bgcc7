import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

const PAGES = ["", "/info", "/mappool", "/teams", "/matches", "/stats", "/pickems", "/streams", "/staff"];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = siteUrl();
  return PAGES.map((p) => ({ url: `${site}${p}`, changeFrequency: "daily", priority: p ? 0.7 : 1 }));
}
