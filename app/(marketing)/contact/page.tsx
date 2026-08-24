import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHero } from "@/components/marketing/page-hero";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Coach Seif Dridi at Fight Zone — book a session, ask a question or join the gym.",
};

const contactChannels = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.contactEmail,
    href: `mailto:${siteConfig.contactEmail}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+216 00 000 000",
    href: "tel:+21600000000",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Tunis, Tunisia",
  },
  {
    icon: Clock,
    label: "Hours",
    value: "Mon – Sat · 08:00 – 21:00",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your goals"
        description="Whether you want to book a session, ask about programs or join the gym — drop a message and I'll get back to you."
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
            <div className="flex flex-col gap-8">
              <Reveal>
                <div className="flex flex-col gap-4">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
                    Get in touch
                  </h2>
                  <p className="text-base leading-relaxed text-muted">
                    Prefer to reach out directly? Pick a channel below — or use
                    the form and I&apos;ll reply within a day.
                  </p>
                </div>
              </Reveal>

              <div className="flex flex-col gap-4">
                {contactChannels.map(({ icon: Icon, label, value, href }, i) => (
                  <Reveal key={label} delay={i * 60}>
                    <div className="flex items-center gap-4 rounded-lg border border-ink-border bg-ink-soft/50 p-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary-soft text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                          {label}
                        </span>
                        {href ? (
                          <a
                            href={href}
                            className="break-all text-sm font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {value}
                          </a>
                        ) : (
                          <span className="break-all text-sm font-medium">{value}</span>
                        )}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal delay={120}>
              <ContactForm />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
