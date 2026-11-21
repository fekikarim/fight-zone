import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
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
      <PageHero eyebrow="FAQ" title="Questions & answers" description="How registration, payments, cancellations and your account work at Fight Zone." />
      <section className="py-12 lg:py-20">
        <Container>
          {data?.length ? <FaqPublic items={data} /> : (
            <EmptyState
              icon={<HelpCircle />}
              title="No questions published yet"
              description="Send your question and Coach Seif will answer you directly."
              actionLabel="Ask a question"
              actionHref="/contact"
            />
          )}
        </Container>
      </section>
    </>
  );
}
