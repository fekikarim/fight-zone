import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, CalendarDays, Clock, Eye, HelpCircle, Mail, MapPin, MessageCircle, MessageSquare, Phone, Reply, Send, ShieldCheck, UserPlus,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { ContactForm } from "@/components/marketing/contact-form";
import { ContactTopics } from "@/components/marketing/contact-topics";
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
              <li key={q.href} className="min-w-0">
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
              <div className="relative flex h-full flex-col gap-7 overflow-hidden rounded-3xl border border-ink-border bg-gradient-to-br from-ink-soft/80 to-ink p-5 sm:p-8">
                <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

                {/* Coach */}
                <div className="relative flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-primary font-display text-lg font-bold text-white shadow-[var(--shadow-hit)] [clip-path:polygon(12%_0,100%_0,88%_100%,0_100%)]">
                    SD
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Talk to Coach Seif</p>
                    <p className="font-display text-xl font-bold uppercase leading-tight tracking-tight">Seif Dridi</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> Head coach · reads every message himself
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <h2 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight sm:text-4xl">Ready when you are</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Beginner or experienced fighter, ask anything — level, schedule, equipment or payment.
                  </p>
                </div>

                {/* Topic shortcuts → pre-select the form topic */}
                <div className="relative">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">What&apos;s it about?</p>
                  <ContactTopics />
                </div>

                {/* What happens next */}
                <div className="relative">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">What happens next</p>
                  <ol className="relative flex flex-col gap-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gradient-to-b before:from-primary before:to-white/10">
                    {[
                      { icon: Send, title: "You send your message", text: "Use the form — it takes a minute." },
                      { icon: Eye, title: "Coach Seif reads it", text: "Personally, no bots or call centre." },
                      { icon: Reply, title: "He replies to you", text: user ? "By email, or in your Messages." : "By email, at the address you give." },
                    ].map(({ icon: Icon, title, text }) => (
                      <li key={title} className="relative flex items-start gap-3.5">
                        <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-ink text-primary-readable">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 pt-0.5">
                          <span className="block text-sm font-semibold">{title}</span>
                          <span className="block text-xs text-muted">{text}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {channels.length ? (
                  <ul className="relative grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {channels.map(({ icon: Icon, label, value, href }) => (
                      <li key={label} className="flex min-w-0 items-start gap-3 rounded-2xl border border-ink-border bg-ink/60 p-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary-soft text-primary">
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
                ) : null}

                {/* Fast track */}
                <Link
                  href={user ? "/member/messages" : "/sign-up"}
                  className="group relative mt-auto flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/[0.08] p-4 transition-colors hover:border-primary/60 hover:bg-primary/[0.12]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    {user ? <MessageSquare className="h-5 w-5" aria-hidden /> : <UserPlus className="h-5 w-5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{user ? "Faster: open your Messages" : "Members chat with Seif directly"}</span>
                    <span className="block text-xs text-muted">{user ? "Your private conversation with Coach Seif." : "Create a free account — it takes a minute."}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary-readable transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>

                <p className="relative flex items-start gap-2 text-xs text-muted">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>Your message is only used to answer you. See our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
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
