import type { Metadata } from "next";
import { FileText, HelpCircle, Image as ImageIcon, Inbox, Scale, Trophy } from "lucide-react";
import Link from "next/link";
import { getAdminMedia, getAdminAchievements } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = {
  title: "Content Management",
  description: "Manage media and achievements.",
};

export default async function AdminContentPage() {
  const [media, achievements] = await Promise.all([
    getAdminMedia(),
    getAdminAchievements(),
  ]);

  const sections = [
    {
      label: "About page",
      description: "Build and publish your About page from blocks, with version history.",
      href: "/admin/content/about",
      icon: FileText,
      count: null,
    },
    {
      label: "FAQ",
      description: "Questions and answers shown on the public FAQ page.",
      href: "/admin/content/faq",
      icon: HelpCircle,
      count: null,
    },
    {
      label: "Privacy & Terms",
      description: "Versioned legal documents (drafts must be reviewed before publishing).",
      href: "/admin/content/legal",
      icon: Scale,
      count: null,
    },
    {
      label: "Contact inbox",
      description: "Messages from the public contact form.",
      href: "/admin/inbox",
      icon: Inbox,
      count: null,
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
      <PageHeader
        title="Content"
        description={
          <>
            Manage your public content: media and achievement records. News articles live in their own{" "}
            <Link href="/admin/news" className="text-primary hover:underline">
              News section
            </Link>
            .
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
                  {section.count != null ? <p className="text-xs text-muted">{section.count} items</p> : null}
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
