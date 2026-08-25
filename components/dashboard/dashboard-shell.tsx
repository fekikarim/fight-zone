"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarClock,
  BookOpen,
  Trophy,
  Crown,
  CreditCard,
  Star,
  MessageSquare,
  Bell,
  User,
  Home,
  Info,
  Newspaper,
  Users,
  Wrench,
  Tag,
  ExternalLink,
  Menu,
  X,
  Globe,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth/guards";

export interface DashboardNavLink {
  href: string;
  label: string;
  /** Optional count rendered as a pill (e.g. unread messages). */
  badge?: number;
}

interface DashboardShellProps {
  user: CurrentUser;
  nav: DashboardNavLink[];
  children: ReactNode;
}

const MEMBER_NAV_ICONS: Record<string, ReactNode> = {
  "/member": <LayoutDashboard className="h-4 w-4 shrink-0" />,
  "/member/sessions": <Dumbbell className="h-4 w-4 shrink-0" />,
  "/member/schedule": <CalendarClock className="h-4 w-4 shrink-0" />,
  "/member/bookings": <BookOpen className="h-4 w-4 shrink-0" />,
  "/member/events": <Trophy className="h-4 w-4 shrink-0" />,
  "/member/subscription": <Crown className="h-4 w-4 shrink-0" />,
  "/member/payments": <CreditCard className="h-4 w-4 shrink-0" />,
  "/member/reviews": <Star className="h-4 w-4 shrink-0" />,
  "/member/messages": <MessageSquare className="h-4 w-4 shrink-0" />,
  "/member/notifications": <Bell className="h-4 w-4 shrink-0" />,
  "/member/profile": <User className="h-4 w-4 shrink-0" />,
};

const MOBILE_NAV_PRIMARY = [
  "/member",
  "/member/sessions",
  "/member/bookings",
  "/member/messages",
  "/member/notifications",
];

const PUBLIC_NAV = [
  { href: "/", label: "Home", icon: <Home className="h-4 w-4 shrink-0" /> },
  { href: "/about", label: "About", icon: <Info className="h-4 w-4 shrink-0" /> },
  { href: "/news", label: "News", icon: <Newspaper className="h-4 w-4 shrink-0" /> },
  { href: "/coaches", label: "Coaches", icon: <Users className="h-4 w-4 shrink-0" /> },
  { href: "/services", label: "Services", icon: <Wrench className="h-4 w-4 shrink-0" /> },
  { href: "/events", label: "Events", icon: <Trophy className="h-4 w-4 shrink-0" /> },
  { href: "/pricing", label: "Pricing", icon: <Tag className="h-4 w-4 shrink-0" /> },
];

function SidebarNavItem({
  href,
  label,
  badge,
  icon,
  active,
  external,
  onClick,
}: {
  href: string;
  label: string;
  badge?: number;
  icon?: ReactNode;
  active?: boolean;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/15 text-primary"
          : "text-zinc-400 hover:bg-ink-soft/60 hover:text-white",
      )}
    >
      <span className={cn("transition-colors", active ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300")}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-ink-base"
          aria-label={`${badge} unread`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : external ? (
        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" aria-hidden />
      ) : null}
    </Link>
  );
}

export function DashboardShell({ user, nav, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const initials = (user.fullName ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isActive = (href: string) => {
    if (pathname === href) return true;
    const rest = pathname.slice(href.length);
    if (!rest.startsWith("/")) return false;
    return !nav.some(
      (other) =>
        other.href !== href &&
        other.href.length > href.length &&
        (pathname === other.href || pathname.startsWith(`${other.href}/`)),
    );
  };

  const primaryMobileNav = nav.filter((item) => MOBILE_NAV_PRIMARY.includes(item.href));

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="flex h-full flex-col">
      {/* Member Nav */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pb-2 pt-4">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            My Dashboard
          </p>
          <nav className="flex flex-col gap-0.5">
            {nav.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                badge={item.badge}
                icon={MEMBER_NAV_ICONS[item.href]}
                active={isActive(item.href)}
                onClick={onLinkClick}
              />
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="mx-4 my-3 border-t border-ink-border/60" />

        {/* Public Nav */}
        <div className="px-3 pb-4">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
            Explore Fight Zone
          </p>
          <nav className="flex flex-col gap-0.5">
            {PUBLIC_NAV.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
                onClick={onLinkClick}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Site link footer */}
      <div className="border-t border-ink-border/60 p-3">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-600 transition-colors hover:text-zinc-300"
          onClick={onLinkClick}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span>fight-zone.app</span>
          <ExternalLink className="ml-auto h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ─── Top Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-ink-border bg-background/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-ink-soft hover:text-white md:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo variant="full" className="[&_img]:!h-8" />
          </div>

          <div className="flex items-center gap-3">
            {/* Quick public nav links — desktop only */}
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Public pages">
              {PUBLIC_NAV.slice(0, 4).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    pathname === item.href
                      ? "text-primary"
                      : "text-zinc-500 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/pricing"
                className="ml-1 flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                Pricing
              </Link>
            </nav>

            <div className="h-5 w-px bg-ink-border hidden lg:block" />

            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-ink-base">
                {initials}
              </span>
              <div className="hidden flex-col leading-tight xl:flex">
                <span className="text-sm font-medium text-white">{user.fullName ?? "Member"}</span>
                <span className="text-xs text-muted">{user.email}</span>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* ─── Desktop Sidebar ─────────────────────────────────────── */}
        <aside className="hidden w-56 shrink-0 border-r border-ink-border bg-ink-soft/20 md:block">
          <div className="sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto">
            <SidebarContent />
          </div>
        </aside>

        {/* ─── Main Content ─────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* ─── Mobile Drawer Overlay ────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink-base/80 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className={cn(
              "absolute left-0 top-0 flex h-full w-72 flex-col border-r border-ink-border bg-ink-base shadow-2xl",
              "animate-in slide-in-from-left duration-300 ease-out",
            )}
          >
            {/* Drawer header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-border px-4">
              <Logo variant="full" className="[&_img]:!h-7" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-ink-soft hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User info in drawer */}
            <div className="flex items-center gap-3 border-b border-ink-border px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-ink-base">
                {initials}
              </span>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold text-white">
                  {user.fullName ?? "Member"}
                </span>
                <span className="truncate text-xs text-muted">{user.email}</span>
              </div>
            </div>

            {/* Nav content */}
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onLinkClick={() => setDrawerOpen(false)} />
            </div>

            {/* Sign out */}
            <div className="border-t border-ink-border p-3">
            <div className="w-full [&>form]:w-full [&_button]:w-full">
              <SignOutButton />
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile Bottom Nav (primary routes only) ─────────────── */}
      <nav
        aria-label="Primary navigation"
        className="sticky bottom-0 z-30 flex border-t border-ink-border bg-ink-base/95 backdrop-blur-md md:hidden"
      >
        {primaryMobileNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-3 transition-colors",
                active ? "text-primary" : "text-zinc-600 hover:text-zinc-300",
              )}
            >
              <span className={cn("transition-colors", active ? "text-primary" : "text-zinc-600")}>
                {MEMBER_NAV_ICONS[item.href]}
              </span>
              <span className="max-w-16 truncate text-[10px] font-medium">
                {item.label === "My Bookings" ? "Bookings" : item.label}
              </span>
              {item.badge ? (
                <span className="absolute right-0 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-ink-base">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        {/* More button opens drawer */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-3 text-zinc-600 transition-colors hover:text-zinc-300"
          aria-label="More navigation options"
        >
          <Menu className="h-4 w-4" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}
