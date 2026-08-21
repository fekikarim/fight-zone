"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn, User, LayoutDashboard, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
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
}

export function NavbarClient({ user }: NavbarProps) {
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

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-ink-border bg-ink/90 backdrop-blur-md"
          : "border-b border-transparent bg-gradient-to-b from-ink/80 to-transparent",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-20">
        <Logo variant="full" className="h-9 sm:h-10" />

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {siteConfig.nav.public.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium tracking-wide transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-ink-soft"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {user.avatarUrl ? (
                    <div className="relative h-8 w-8 rounded-full bg-ink-soft overflow-hidden">
                      <Image
                        src={user.avatarUrl}
                        alt={user.fullName || "User"}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    getInitials(user.fullName)
                  )}
                </div>
                <span className="text-foreground">{user.fullName || "Member"}</span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-ink-border bg-ink shadow-lg">
                  <div className="p-2">
                    <Link
                      href="/member"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/member/profile"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <hr className="my-2 border-ink-border" />
                    <form action="/sign-out" method="POST">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
              <Button variant="primary" size="sm" asChild>
                <Link href="/sign-up">Join the gym</Link>
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-ink-border text-foreground transition-colors hover:border-primary hover:text-primary lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {/* Mobile menu */}
      <div
        id="mobile-menu-panel"
        role="region"
        aria-label="Mobile navigation"
        aria-hidden={!open}
        inert={!open || undefined}
        className={cn(
          "overflow-hidden border-t border-ink-border bg-ink transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[70vh]" : "max-h-0",
        )}
      >
        <Container className="flex flex-col gap-1 py-4">
          {siteConfig.nav.public.map((link, i) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{ transitionDelay: `${i * 30}ms` }}
                className={cn(
                  "rounded-md px-3 py-3 text-base font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-ink-soft hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {user ? (
            <>
              <hr className="my-2 border-ink-border" />
              <Link
                href="/member/dashboard"
                className="flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              <Link
                href="/member/profile"
                className="flex items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
              >
                <User className="h-5 w-5" />
                Profile
              </Link>
              <form action="/sign-out" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button variant="outline" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button variant="primary" asChild>
                <Link href="/sign-up">Join the gym</Link>
              </Button>
            </div>
          )}
        </Container>
      </div>
    </header>
  );
}
