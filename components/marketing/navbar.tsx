"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn, User, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { FreshnessDot } from "@/components/content/freshness-dot";
import type { ContentMarker } from "@/lib/supabase/queries";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    roles: string[];
  } | null;
  freshness: {
    news: ContentMarker | null;
    events: ContentMarker | null;
  };
}

/** Pages that clear each feed's indicator (shared seen-key per feed). */
const NEWS_HREFS = ["/news"];
const EVENTS_HREFS = ["/events", "/member/events"];

function freshnessFor(href: string, freshness: NavbarProps["freshness"]): ContentMarker | null {
  if (href === "/news") return freshness.news;
  if (href === "/events") return freshness.events;
  return null;
}

export function NavbarClient({ user, freshness }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on outside click or Escape
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu when navigating (adjust state during render).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setAccountMenuOpen(false);
  }

  // Lock body scroll while the mobile menu is open; Escape closes it.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Staff (coach/admin) never use the member dashboard: they get the
  // admin entry instead, so they can't land on MEMBER-gated routes.
  const isStaff =
    user?.roles.some((role) => role === "ADMIN" || role === "COACH") ?? false;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const menuItem =
    "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-ink-softer hover:text-foreground";

  return (
    <>
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300",
        scrolled || open
          ? "border-b border-ink-border bg-ink/95 backdrop-blur-md"
          : "border-b border-transparent bg-gradient-to-b from-ink/85 to-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo variant="full" />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {siteConfig.nav.public.map((link) => {
            const active = isActive(link.href);
            const kind = link.href === "/news" ? "news" : link.href === "/events" ? "events" : null;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative inline-flex h-16 items-center px-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors",
                  active ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {link.label}
                {kind ? (
                  <FreshnessDot
                    kind={kind}
                    hrefs={kind === "news" ? NEWS_HREFS : EVENTS_HREFS}
                    userId={user?.id ?? null}
                    initial={freshnessFor(link.href, freshness)}
                  />
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3.5 bottom-[18px] h-[3px] origin-left -skew-x-12 bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 group-hover:bg-ink-strong",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                className="flex h-10 items-center gap-2.5 rounded-md pl-1.5 pr-3 text-sm font-medium transition-colors hover:bg-ink-softer"
              >
                <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small storage avatar
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(user.fullName)
                  )}
                </span>
                <span className="max-w-36 truncate text-foreground">{user.fullName || "Member"}</span>
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  aria-label="Account"
                  className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-ink-border bg-ink-soft p-1.5 shadow-[var(--shadow-lift)] animate-[fz-panel-in_220ms_var(--ease-out)_both]"
                >
                  {isStaff ? (
                    <Link href="/admin" role="menuitem" className={menuItem} onClick={() => setAccountMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                      Admin dashboard
                    </Link>
                  ) : (
                    <>
                      <Link href="/member" role="menuitem" className={menuItem} onClick={() => setAccountMenuOpen(false)}>
                        <LayoutDashboard className="h-4 w-4" aria-hidden />
                        My dashboard
                      </Link>
                      <Link href="/member/profile" role="menuitem" className={menuItem} onClick={() => setAccountMenuOpen(false)}>
                        <User className="h-4 w-4" aria-hidden />
                        Profile
                      </Link>
                    </>
                  )}
                  <hr className="my-1.5 border-ink-border" />
                  <form action="/sign-out" method="POST">
                    <button type="submit" role="menuitem" className={cn(menuItem, "w-full")}>
                      <LogOut className="h-4 w-4" aria-hidden />
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">
                  <LogIn className="h-4 w-4" aria-hidden />
                  Sign in
                </Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link href="/sign-up">Join Fight Zone</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu-panel"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-ink-strong text-foreground transition-colors hover:border-foreground/60 lg:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </Container>

    </header>

      {/* Mobile menu: rendered OUTSIDE the header — the header's backdrop-filter
          makes it the containing block for fixed children, which collapsed this
          panel to the header's 64px height on phones. */}
      <div
        id="mobile-menu-panel"
        role="region"
        aria-label="Mobile navigation"
        aria-hidden={!open}
        inert={!open || undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto overscroll-contain bg-ink pb-[env(safe-area-inset-bottom)] transition-[opacity,visibility,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
        )}
      >
        <Container className="flex min-h-full flex-col py-6">
          <nav aria-label="Mobile" className="flex flex-col">
            {siteConfig.nav.public.map((link, i) => {
              const active = isActive(link.href);
              const kind = link.href === "/news" ? "news" : link.href === "/events" ? "events" : null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
                  className={cn(
                    "flex items-center justify-between border-b border-ink-border py-4 font-display text-3xl font-bold uppercase tracking-tight transition-[transform,opacity,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                    active ? "text-foreground" : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  <span className="inline-flex items-center">
                    {link.label}
                    {kind ? (
                      <FreshnessDot
                        kind={kind}
                        hrefs={kind === "news" ? NEWS_HREFS : EVENTS_HREFS}
                        userId={user?.id ?? null}
                        initial={freshnessFor(link.href, freshness)}
                      />
                    ) : null}
                  </span>
                  {active ? <span className="slant-bar" aria-hidden /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-8">
            {user ? (
              <div className="grid gap-2">
                {isStaff ? (
                  <Button asChild size="lg">
                    <Link href="/admin"><LayoutDashboard className="h-5 w-5" aria-hidden />Admin dashboard</Link>
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild size="lg">
                      <Link href="/member"><LayoutDashboard className="h-5 w-5" aria-hidden />Dashboard</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/member/profile"><User className="h-5 w-5" aria-hidden />Profile</Link>
                    </Button>
                  </div>
                )}
                <form action="/sign-out" method="POST">
                  <Button type="submit" variant="ghost" size="lg" className="w-full">
                    <LogOut className="h-5 w-5" aria-hidden />
                    Sign out
                  </Button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button variant="primary" size="lg" asChild>
                  <Link href="/sign-up">Join Fight Zone</Link>
                </Button>
              </div>
            )}
          </div>
        </Container>
      </div>
    </>
  );
}
