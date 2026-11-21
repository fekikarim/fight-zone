import Link from "next/link";
import { Container } from "@/components/ui/container";
import { extractHeadings, RichText } from "@/lib/cms/rich-text";
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
  const toc = doc ? extractHeadings(doc.content) : [];
  return (
    <>
      <section className="border-b border-ink-border pb-12 pt-28 sm:pt-36">
        <Container>
          <p className="type-overline flex items-center gap-3 text-muted">
            <span className="slant-bar sweep" aria-hidden />
            Legal
          </p>
          <h1 className="type-h1 mt-5"><span className="rise-line"><span>{doc?.title ?? title}</span></span></h1>
          {doc ? (
            <p className="mt-5 text-sm text-muted">
              Version {doc.version}
              {doc.published_at ? ` · last updated ${formatDate(doc.published_at, { day: "numeric", month: "long", year: "numeric" })}` : ""}
              {doc.status === "SUPERSEDED" ? (
                <>
                  {" "}· <strong className="text-warning">older version</strong> —{" "}
                  <Link href={`/${kind}`} className="link-draw font-semibold text-foreground">see the current one</Link>
                </>
              ) : null}
            </p>
          ) : null}
        </Container>
      </section>

      <section className="pb-24 pt-12">
        <Container>
          {doc ? (
            <div className="grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
              {toc.length ? (
                <nav aria-label="On this page" className="hidden lg:block">
                  <div className="sticky top-24">
                    <p className="type-overline mb-4 text-[10px] text-muted-foreground">On this page</p>
                    <ol className="flex flex-col gap-0.5 border-l border-ink-border">
                      {toc.map((h) => (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm leading-snug text-muted transition-colors hover:border-primary hover:text-foreground"
                          >
                            {h.label}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                </nav>
              ) : <div className="hidden lg:block" />}
              <article className="min-w-0 max-w-[44rem]">
                <RichText text={doc.content} className="text-base leading-[1.75] text-foreground/85 [&_li]:my-1.5 [&_p]:my-4 sm:text-[17px]" />
                {docs.length > 1 ? (
                  <nav aria-label="Previous versions" className="mt-14 border-t border-ink-border pt-6 text-sm">
                    <p className="type-overline mb-3 text-[10px] text-muted-foreground">Version history</p>
                    <ul className="flex flex-wrap gap-2">
                      {docs.map((d) => (
                        <li key={d.id}>
                          <Link
                            href={d.status === "PUBLISHED" ? `/${kind}` : `/${kind}?v=${d.version}`}
                            aria-current={doc.id === d.id ? "page" : undefined}
                            className="inline-flex min-h-9 items-center rounded-sm border border-ink-border px-3 text-muted transition-colors hover:border-ink-strong hover:text-foreground aria-[current=page]:border-foreground/50 aria-[current=page]:text-foreground"
                          >
                            v{d.version}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
              </article>
            </div>
          ) : (
            <p className="max-w-xl text-muted">
              This page is being finalised. For any question about your data or our terms,{" "}
              <Link href="/contact" className="link-draw font-semibold text-foreground">contact us</Link>.
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
