import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, PUBLIC_SITE_URL } from "@/lib/public-site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map(path => ({ url: `${PUBLIC_SITE_URL}${path === "/" ? "" : path}` }));
}
