import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl, getSupabaseEnv } from "@/lib/supabase/config";

export const revalidate = 3600;

/** Only public, published content (anon client → RLS hides drafts/private). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const staticPages = ["", "/about", "/events", "/news", "/faq", "/contact", "/privacy", "/terms"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "weekly" as const,
  }));
  try {
    const { url, key } = getSupabaseEnv();
    const anon = createClient(url, key, { auth: { persistSession: false } });
    const [events, news] = await Promise.all([
      anon.from("events").select("id, updated_at").eq("is_public", true).eq("status", "PUBLISHED").limit(500),
      anon.from("news").select("slug, updated_at").eq("is_published", true).limit(1000),
    ]);
    return [
      ...staticPages,
      ...(events.data ?? []).map((e) => ({ url: `${base}/events/${e.id}`, lastModified: e.updated_at })),
      ...(news.data ?? []).map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: n.updated_at })),
    ];
  } catch {
    return staticPages;
  }
}
