import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/member", "/api", "/preview", "/sign-out", "/auth"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
