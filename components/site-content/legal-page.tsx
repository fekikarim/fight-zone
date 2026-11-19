import Link from "next/link";
import { Container } from "@/components/ui/container";
import { RichText } from "@/lib/cms/rich-text";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

/** Public legal document: the published version, or a requested older one. */
export async function LegalPage({ kind, version }: { kind: "privacy" | "terms"; version?: number }) {
  const supabase = await createClient();
  const { data: all } = await supabase.from("legal_documents").select("id, version, title, content, status, published_at")
    .eq("kind", kind).in("status", ["PUBLISHED", "SUPERSEDED"]).order("version", { ascending: false });
  const docs = all ?? [];
  const doc = (version ? docs.find((d) => d.version === version) : docs.find((d) => d.status === "PUBLISHED")) ?? docs[0];
  const title = kind === "privacy" ? "Privacy Policy" : "Terms of Use";
  return (
    <section className="pb-20 pt-28 lg:pt-32">
      <Container className="max-w-3xl">
        {doc ? (
          <article>
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight">{doc.title}</h1>
            <p className="mt-2 text-sm text-muted">
              Version {doc.version}{doc.published_at ? ` · last updated ${formatDate(doc.published_at, { day: "numeric", month: "long", year: "numeric" })}` : ""}
              {doc.status === "SUPERSEDED" ? <> · <strong>older version</strong> — <Link href={`/${kind}`} className="text-primary hover:underline">see the current one</Link></> : null}
            </p>
            <RichText text={doc.content} className="mt-8 text-base leading-relaxed text-foreground/85" />
            {docs.length > 1 ? (
              <nav aria-label="Previous versions" className="mt-12 border-t border-ink-border pt-6 text-sm">
                <p className="mb-2 text-muted">Version history</p>
                <ul className="flex flex-wrap gap-3">
                  {docs.map((d) => <li key={d.id}><Link href={d.status === "PUBLISHED" ? `/${kind}` : `/${kind}?v=${d.version}`} className="text-primary hover:underline">v{d.version}</Link></li>)}
                </ul>
              </nav>
            ) : null}
          </article>
        ) : (
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight">{title}</h1>
            <p className="mt-4 text-muted">This page is being finalised. For any question about your data or our terms, <Link href="/contact" className="text-primary hover:underline">contact us</Link>.</p>
          </div>
        )}
      </Container>
    </section>
  );
}
