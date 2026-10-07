import type { MetadataRoute } from "next";
import { SITE } from "@/constants/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/build", "/design", "/admin"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
