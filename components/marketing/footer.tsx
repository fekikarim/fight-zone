import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings/queries";

interface SocialIconProps {
  className?: string;
}

function InstagramIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YoutubeIcon({ className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, { label: string; icon: (p: SocialIconProps) => React.ReactElement }> = {
  instagram: { label: "Instagram", icon: InstagramIcon },
  facebook: { label: "Facebook", icon: FacebookIcon },
  youtube: { label: "YouTube", icon: YoutubeIcon },
};

/** Contact details and socials come only from Seif's Settings (never invented). */
export async function Footer() {
  const settings = await getSiteSettings();
  const socialLinks = Object.entries(settings.social_links)
    .filter(([k]) => k in SOCIAL_ICONS)
    .map(([k, href]) => ({ href, ...SOCIAL_ICONS[k] }));
  const hasContact = settings.contact_email || settings.contact_phone || settings.whatsapp || settings.address || settings.working_hours;
  const linkCls = "link-draw w-fit text-sm text-muted transition-colors hover:text-foreground";
  const colTitle = "type-overline mb-1 text-foreground";
  return (
    <footer className="relative overflow-hidden border-t border-ink-border bg-ink">
      <Container className="grid gap-10 pb-12 pt-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-12">
        <div className="flex flex-col gap-5">
          <Logo variant="full" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Boxing, kickboxing and fitness coaching with Coach Seif Dridi in Tunisia. Register for
            events, follow your progress and talk to your coach in one place.
          </p>
          {socialLinks.length ? (
            <div className="flex items-center gap-2">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Fight Zone on ${label}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-ink-strong text-muted transition-[color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/60 hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <nav aria-label="Explore" className="flex flex-col gap-3">
          <h2 className={colTitle}>Explore</h2>
          {siteConfig.nav.public.map((link) => (
            <Link key={link.href} href={link.href} className={linkCls}>
              {link.label}
            </Link>
          ))}
          <Link href="/faq" className={linkCls}>FAQ</Link>
        </nav>

        <nav aria-label="Members" className="flex flex-col gap-3">
          <h2 className={colTitle}>Members</h2>
          <Link href="/member" className={linkCls}>Member area</Link>
          <Link href="/member/events" className={linkCls}>My events</Link>
          <Link href="/sign-in" className={linkCls}>Sign in</Link>
          <Link href="/sign-up" className={linkCls}>Create an account</Link>
        </nav>

        <div className="flex flex-col gap-3">
          <h2 className={colTitle}>Contact</h2>
          {settings.contact_email ? (
            <a href={`mailto:${settings.contact_email}`} className="inline-flex items-center gap-2 break-all text-sm text-muted transition-colors hover:text-foreground">
              <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />{settings.contact_email}
            </a>
          ) : null}
          {settings.contact_phone ? (
            <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
              <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />{settings.contact_phone}
            </a>
          ) : null}
          {settings.whatsapp ? (
            <a href={`https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground">
              <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />WhatsApp
            </a>
          ) : null}
          {settings.address ? (
            <span className="inline-flex items-start gap-2 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{settings.address}</span>
          ) : null}
          {settings.working_hours ? (
            <span className="inline-flex items-start gap-2 whitespace-pre-line text-sm text-muted"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{settings.working_hours}</span>
          ) : null}
          {!hasContact ? (
            <Link href="/contact" className={linkCls}>Send Coach Seif a message</Link>
          ) : null}
        </div>
      </Container>

      {/* Closing wordmark — set in the display face across the full width. */}
      <Container aria-hidden className="select-none">
        <p className="font-display text-[clamp(4.5rem,17vw,15rem)] font-bold uppercase leading-[0.8] tracking-tight text-ink-softer">
          Fight Zone
        </p>
      </Container>

      <div className="border-t border-ink-border">
        <Container className="flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex gap-5 text-xs text-muted-foreground">
            <Link href="/privacy" className="link-draw hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="link-draw hover:text-foreground">Terms</Link>
            <Link href="/contact" className="link-draw hover:text-foreground">Contact</Link>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
