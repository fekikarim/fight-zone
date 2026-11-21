import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { CreateLegalDraftButton, LegalDraftEditor } from "@/components/site-content/legal-admin";
import { PRIVACY_TEMPLATE, TERMS_TEMPLATE } from "@/lib/legal/templates";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Legal pages" };

export default async function AdminLegalPage() {
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data } = await supabase.from("legal_documents").select("id, kind, version, title, content, status, published_at, created_at").order("version", { ascending: false });
  const docs = data ?? [];
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader eyebrow="Publish" title="Privacy & Terms" back={{ href: "/admin/content", label: "Back to content" }}
        description="Versioned legal documents. Published versions can't be edited — create a new draft version instead. Have the text reviewed by a qualified lawyer before publishing." />
      {(["privacy", "terms"] as const).map((kind) => {
        const list = docs.filter((d) => d.kind === kind);
        const draft = list.find((d) => d.status === "DRAFT");
        const live = list.find((d) => d.status === "PUBLISHED");
        return (
          <section key={kind} className="space-y-4" aria-labelledby={`${kind}-h`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`${kind}-h`} className="font-display text-xl font-semibold uppercase tracking-tight">{kind === "privacy" ? "Privacy policy" : "Terms of use"}</h2>
              <div className="flex items-center gap-3">
                {live ? <Link href={`/${kind}`} className="text-sm text-primary hover:underline">View live (v{live.version})</Link> : <Badge variant="outline">Not published</Badge>}
                {!draft ? <CreateLegalDraftButton kind={kind} template={kind === "privacy" ? PRIVACY_TEMPLATE : TERMS_TEMPLATE} /> : null}
              </div>
            </div>
            {draft ? <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6"><LegalDraftEditor doc={draft} /></div> : null}
            {list.filter((d) => d.status !== "DRAFT").length ? (
              <ul className="divide-y divide-ink-border rounded-xl border border-ink-border text-sm">
                {list.filter((d) => d.status !== "DRAFT").map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                    <span>Version {d.version} · {d.published_at ? formatDate(d.published_at, { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                    <Badge variant={d.status === "PUBLISHED" ? "default" : "neutral"}>{d.status === "PUBLISHED" ? "Live" : "Superseded"}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
