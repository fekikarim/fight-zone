import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/site";

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

const socialLinks = [
  { href: siteConfig.social.instagram, label: "Instagram", icon: InstagramIcon },
  { href: siteConfig.social.facebook, label: "Facebook", icon: FacebookIcon },
  { href: siteConfig.social.youtube, label: "YouTube", icon: YoutubeIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-border bg-ink-soft/40">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo variant="full" className="h-10" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Professional boxing, kickboxing and fitness coaching with Coach Seif
            Dridi. Train hard, fight smart.
          </p>
          <div className="flex items-center gap-2">
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-border text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Explore
          </h2>
          {siteConfig.nav.public.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Members
          </h2>
          <Link href="/member" className="text-sm text-muted transition-colors hover:text-primary">
            Member area
          </Link>
          <Link href="/sign-in" className="text-sm text-muted transition-colors hover:text-primary">
            Sign in
          </Link>
          <Link href="/sign-up" className="text-sm text-muted transition-colors hover:text-primary">
            Join the gym
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Contact
          </h2>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4" />
            {siteConfig.contactEmail}
          </a>
          <a
            href="tel:+21600000000"
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
          >
            <Phone className="h-4 w-4" />
            +216 00 000 000
          </a>
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <MapPin className="h-4 w-4" />
            Tunis, Tunisia
          </span>
        </div>
      </Container>

      <Separator />

      <Container className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Train · Fight · Win
        </p>
      </Container>
    </footer>
  );
}
