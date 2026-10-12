import type { MetadataRoute } from "next";
import { PUBLIC_SITE_URL } from "@/lib/public-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/owner", "/api/", "/checkout", "/order/", "/mock", "/gift/", "/rewards"] },
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
