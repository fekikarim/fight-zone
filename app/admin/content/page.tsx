import type { Metadata } from "next";
import { Newspaper, Image as ImageIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { getAdminNews, getAdminMedia, getAdminAchievements } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Content Management",
  description: "Manage news articles, media, and achievements.",
};

export default async function AdminContentPage() {
  const [news, media, achievements] = await Promise.all([
    getAdminNews(),
    getAdminMedia(),
    getAdminAchievements(),
  ]);

  const sections = [
    {
      label: "News & Articles",
      description: "Write and publish training tips, event recaps, and announcements.",
      href: "/admin/content/news",
      icon: Newspaper,
      count: news.length,
    },
    {
      label: "Media Library",
      description: "Upload and manage photos, videos, and documents.",
      href: "/admin/content/media",
      icon: ImageIcon,
      count: media.length,
    },
    {
      label: "Achievements & Palmares",
      description: "Track championships, certifications, and awards.",
      href: "/admin/content/achievements",
      icon: Trophy,
      count: achievements.length,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Content Management</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your public content: news articles, media, and achievement records.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-ink-border bg-ink-soft/30 p-6 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-soft">
                  <Icon className="h-5 w-5 text-muted group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{section.label}</p>
                  <p className="text-xs text-muted">{section.count} items</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
