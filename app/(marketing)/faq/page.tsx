import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/marketing/page-hero";
import { FaqPublic } from "@/components/site-content/faq-public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Fight Zone events, registration and payments.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("faq_items").select("id, category, question, answer").eq("is_published", true).order("position").order("created_at");
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions & answers" description="Everything about events, registration and payment." />
      <section className="py-12 lg:py-20">
        <Container className="max-w-3xl">
          {data?.length ? <FaqPublic items={data} /> : (
            <p className="rounded-xl border border-dashed border-ink-border px-6 py-12 text-center text-sm text-muted">
              No questions published yet. <Link href="/contact" className="text-primary hover:underline">Send us your question</Link>.
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
