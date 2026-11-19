import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Clock, HelpCircle, Mail, MapPin, MessageCircle, MessageSquare, Phone, ShieldCheck, UserPlus,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHero } from "@/components/marketing/page-hero";
import { getSiteSettings } from "@/lib/settings/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { RichText } from "@/lib/cms/rich-text";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Coach Seif Dridi at Fight Zone — questions about events, training or joining.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [settings, user, supabase] = await Promise.all([getSiteSettings(), getCurrentUser(), createClient()]);
  const { data: faq } = await supabase.from("faq_items").select("id, question, answer")
    .eq("is_published", true).order("position").limit(4);

  // Only channels Seif configured in Settings — nothing invented.
  const channels = [
    settings.contact_email && { icon: Mail, label: "Email", value: settings.contact_email, href: `mailto:${settings.contact_email}` },
    settings.contact_phone && { icon: Phone, label: "Phone", value: settings.contact_phone, href: `tel:${settings.contact_phone.replace(/[^\d+]/g, "")}` },
    settings.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: settings.whatsapp, href: `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}` },
    settings.address && { icon: MapPin, label: "Location", value: settings.address },
    settings.working_hours && { icon: Clock, label: "Hours", value: settings.working_hours },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; value: string; href?: string }>;

  const quick = [
    { href: "/events", icon: CalendarDays, title: "Upcoming events", text: "Dates, places and prices." },
    { href: "/faq", icon: HelpCircle, title: "FAQ", text: "Registration, payments, cancellations." },
    user
      ? { href: "/member/messages", icon: MessageSquare, title: "Message Coach Seif", text: "Your private conversation." }
      : { href: "/sign-up", icon: UserPlus, title: "Join Fight Zone", text: "Free account, one minute." },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your goals"
        description="Questions about an event, your training or joining Fight Zone? Send a message — Coach Seif reads every one."
      />

      <section className="relative py-14 lg:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent" />
        <Container className="relative">
          <ul className="mb-10 grid gap-3 lg:grid-cols-3">
            {quick.map((q, i) => (
              <li key={q.href}>
                <Reveal delay={i * 60}>
                  <Link href={q.href} className="group flex h-full items-center gap-4 rounded-2xl border border-ink-border bg-ink-soft/50 p-4 transition-colors hover:border-primary/50">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><q.icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{q.title}</span>
                      <span className="block truncate text-xs text-muted">{q.text}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>

          <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
            <Reveal>
              <div className="flex h-full flex-col gap-6 rounded-3xl border border-ink-border bg-gradient-to-br from-ink-soft/80 to-ink p-6 sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Talk to Coach Seif</p>
                  <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-tight">Ready when you are</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Beginner or experienced fighter, ask anything — level, schedule, equipment or payment.
                    {user ? " As a member, the fastest way is your private conversation in Messages." : " Members can also chat with Coach Seif privately from their account."}
                  </p>
                </div>

                {channels.length ? (
                  <ul className="grid gap-3">
                    {channels.map(({ icon: Icon, label, value, href }) => (
                      <li key={label} className="flex items-start gap-4 rounded-xl border border-ink-border bg-ink/60 p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary-soft text-primary">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</span>
                          {href ? (
                            <a href={href} {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                              className="break-words text-sm font-medium hover:text-primary">{value}</a>
                          ) : <span className="whitespace-pre-line break-words text-sm font-medium">{value}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-ink-border p-5 text-sm text-muted">
                    Use the form — your message goes straight to Coach Seif.
                  </div>
                )}

                <p className="mt-auto flex items-start gap-2 text-xs text-muted">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Your message is only used to answer you. See our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase tracking-tight">Send a message</h2>
                  <p className="text-sm text-muted">All fields are required.</p>
                </div>
                <ContactForm />
              </div>
            </Reveal>
          </div>

          {faq?.length ? (
            <section aria-labelledby="quick-faq" className="mt-16">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <h2 id="quick-faq" className="font-display text-2xl font-bold uppercase tracking-tight">Quick answers</h2>
                <Link href="/faq" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">All questions <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {faq.map((f) => (
                  <details key={f.id} className="group rounded-xl border border-ink-border bg-ink-soft/40 open:border-primary/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      {f.question}
                      <span className="shrink-0 text-primary transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <RichText text={f.answer} className="px-4 pb-4 text-sm leading-relaxed text-muted" />
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </Container>
      </section>
    </>
  );
}
