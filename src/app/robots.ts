import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/links";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/me", "/overlay"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
