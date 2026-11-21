"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Medal,
  MessageCircle,
  Newspaper,
  Settings,
  Star,
  Trophy,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { signOut } from "@/lib/actions/auth";
import { LiveUpdates } from "@/components/dashboard/live-updates";
import { FreshnessDot } from "@/components/content/freshness-dot";
import type { ContentMarker } from "@/lib/supabase/queries";
import type { CurrentUser } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

export interface DashboardNavLink {
  href: string;
  label: string;
  /** Optional count rendered as a pill (e.g. unread messages). */
  badge?: number;
  /** Group heading inside the "More" sheet. */
  group?: string;
  /** Pinned to the floating dock (max 4 + More). */
  dock?: boolean;
}

interface DashboardShellProps {
  user: CurrentUser;
  nav: DashboardNavLink[];
  children: ReactNode;
  freshness?: { news: ContentMarker | null; events: ContentMarker | null } | null;
}

const EVENTS_HREFS = ["/events", "/member/events"];

const ICONS: Record<string, typeof Home> = {
  "/member": Home,
  "/member/events": Trophy,
  "/member/schedule": CalendarClock,
  "/member/achievements": Medal,
  "/member/reviews": Star,
  "/member/messages": MessageCircle,
  "/member/notifications": Bell,
  "/member/profile": User,
  "/admin": Home,
  "/admin/events": Trophy,
  "/admin/calendar": CalendarDays,
  "/admin/payments": Wallet,
  "/admin/members": Users,
  "/admin/reports": BarChart3,
  "/admin/badges": Medal,
  "/admin/settings": Settings,
  "/admin/news": Newspaper,
  "/admin/reviews": Star,
  "/admin/messages": MessageCircle,
  "/admin/notifications": Bell,
  "/admin/content": FileText,
};

function isActiveNav(pathname: string, href: string, nav: DashboardNavLink[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !nav.some(
    (o) => o.href !== href && o.href.length > href.length && (pathname === o.href || pathname.startsWith(`${o.href}/`)),
  );
}

/** Dock tab: icon over label on phones/tablets, icon beside label on desktop. */
const DOCK_ITEM =
  "relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-0.5 transition-[background-color,color,transform] duration-200 active:scale-[0.96] " +
  "lg:min-h-[52px] lg:flex-none lg:flex-row lg:gap-2.5 lg:px-5";
const DOCK_LABEL = "max-w-full truncate text-[11px] font-semibold leading-none max-[359px]:text-[10px] max-[359px]:tracking-tight lg:text-sm";

function Count({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-ink tabular",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
      <span className="sr-only"> new</span>
    </span>
  );
}

/**
 * App-style shell for the member area and the coach console:
 * a floating glass top bar, a floating dock (iOS tab-bar style, on phones
 * AND desktop) for the four main destinations, and a "More" sheet with the
 * rest as big tiles. No sidebar, no admin chrome.
 */
export function DashboardShell({ user, nav, children, freshness }: DashboardShellProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isStaff = user.roles.some((r) => r === "ADMIN" || r === "COACH");
  const homeHref = isStaff ? "/admin" : "/member";
  const notificationsHref = isStaff ? "/admin/notifications" : "/member/notifications";
  const unread = nav.find((n) => n.href === notificationsHref)?.badge ?? 0;
  const firstName = user.fullName?.split(" ")[0] ?? (isStaff ? "Coach" : "Athlete");
  const initials = (user.fullName ?? user.email).split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  // A conversation is immersive on phones/tablets: no top bar or dock.
  const chatRoute = pathname === "/member/messages" || pathname.startsWith("/admin/messages/");
  const dock = nav.filter((n) => n.dock).slice(0, 4);
  const rest = nav.filter((n) => !n.dock);
  const current = nav.find((n) => n.href !== homeHref && isActiveNav(pathname, n.href, nav));
  const section = pathname.slice(homeHref.length + 1).split("/")[0]?.replace(/-/g, " ");
  const screenTitle =
    current?.label ?? (pathname === homeHref || !section ? `Hi, ${firstName}` : section.charAt(0).toUpperCase() + section.slice(1));
  const moreActive = rest.some((n) => isActiveNav(pathname, n.href, nav));
  const moreBadge = rest.reduce((sum, n) => sum + (n.badge ?? 0), 0);

  // Close overlays on navigation.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMoreOpen(false);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const groups: { name: string; items: DashboardNavLink[] }[] = [];
  for (const item of rest) {
    const name = item.group ?? "More";
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(item);
    else groups.push({ name, items: [item] });
  }

  return (
    <div className="app-shell relative min-h-dvh">
      <LiveUpdates userId={user.id} role={isStaff ? "staff" : "member"} />

      {/* Ambient arena light */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(225,29,72,0.16),transparent_70%)]" />

      {/* ─── Floating top bar ─────────────────────────────────────── */}
      <header className={cn("fixed inset-x-0 top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5", chatRoute && "hidden lg:block")}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-ink/70 pl-3 pr-1.5 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:pl-4">
          <div className="flex min-w-0 items-center gap-3">
            <Logo variant="icon" href={homeHref} />
            <span className="h-7 w-px shrink-0 bg-white/10" aria-hidden />
            <div key={screenTitle} className="flex min-w-0 flex-col justify-center animate-[fz-backdrop-in_260ms_ease-out_both]">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-muted-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_rgba(225,29,72,0.8)]" aria-hidden />
                {isStaff ? "Coach console" : "Member area"}
              </span>
              <span className="mt-1 truncate font-display text-lg font-bold uppercase leading-none tracking-tight">
                {screenTitle}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={notificationsHref}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <Bell className="h-5 w-5" aria-hidden />
              {unread ? <Count n={unread} className="absolute right-1 top-1" /> : null}
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-11 items-center gap-2.5 rounded-xl pl-1.5 pr-2 transition-colors hover:bg-white/[0.06] sm:pr-3"
              >
                <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- storage avatar
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <span className="hidden text-sm font-medium sm:block">{firstName}</span>
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl border border-white/[0.08] bg-ink-soft/95 p-1.5 shadow-[var(--shadow-lift)] backdrop-blur-xl animate-[fz-panel-in_200ms_var(--ease-out)_both]"
                >
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.fullName ?? "Member"}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <MenuLink href={isStaff ? "/admin/settings" : "/member/profile"} icon={isStaff ? Settings : User}>
                    {isStaff ? "Settings" : "Profile"}
                  </MenuLink>
                  <MenuLink href="/" icon={ArrowUpRight}>View public site</MenuLink>
                  <form action={signOut}>
                    <button type="submit" role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 transition-colors hover:bg-danger-soft">
                      <LogOut className="h-4 w-4" aria-hidden /> Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={cn(
          "mx-auto w-full max-w-[1200px] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] sm:px-6 sm:pt-28",
          chatRoute && "max-lg:p-0",
        )}
      >
        {children}
      </main>

      {/* ─── Floating dock ────────────────────────────────────────── */}
      <nav
        aria-label="Primary"
        className={cn("fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 min-[360px]:px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", chatRoute && "max-lg:hidden")}
      >
        <div className="flex w-full max-w-[460px] items-stretch gap-0.5 rounded-[28px] border border-white/[0.08] bg-ink/75 p-1 min-[360px]:p-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:gap-1 lg:w-auto lg:max-w-none">
          {dock.map((item) => {
            const active = isActiveNav(pathname, item.href, nav);
            const Icon = ICONS[item.href] ?? LayoutGrid;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(DOCK_ITEM, active ? "bg-primary text-white shadow-[var(--shadow-hit)]" : "text-muted hover:bg-white/[0.06] hover:text-foreground")}
              >
                <span className="relative flex shrink-0">
                  <Icon className="h-[22px] w-[22px] lg:h-5 lg:w-5" aria-hidden />
                  {item.badge ? <Count n={item.badge} className="absolute -right-2.5 -top-2" /> : null}
                  {item.href === "/member/events" ? (
                    <span className="absolute -right-1 -top-1 flex">
                      <FreshnessDot kind="events" hrefs={EVENTS_HREFS} userId={user.id} initial={freshness?.events ?? null} />
                    </span>
                  ) : null}
                </span>
                <span className={DOCK_LABEL}>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-controls="more-sheet"
            className={cn(DOCK_ITEM, moreActive ? "bg-white/[0.1] text-foreground" : "text-muted hover:bg-white/[0.06] hover:text-foreground")}
          >
            <span className="relative flex shrink-0">
              <LayoutGrid className="h-[22px] w-[22px] lg:h-5 lg:w-5" aria-hidden />
              {moreBadge ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-ink" aria-hidden /> : null}
            </span>
            <span className={DOCK_LABEL}>More</span>
          </button>
        </div>
      </nav>

      {/* ─── More sheet ───────────────────────────────────────────── */}
      {moreOpen ? (
        <div id="more-sheet" role="dialog" aria-modal="true" aria-label="More" className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fz-backdrop-in_200ms_ease-out_both]" onClick={() => setMoreOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[32px] border-t border-white/[0.08] bg-ink-soft px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 animate-[fz-sheet-up_320ms_var(--ease-out)_both] sm:inset-x-auto sm:bottom-28 sm:left-1/2 sm:w-[min(640px,92vw)] sm:-translate-x-1/2 sm:rounded-[32px] sm:border sm:pb-6 sm:animate-[fz-panel-in_260ms_var(--ease-out)_both]">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-2xl font-bold uppercase tracking-tight">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-muted transition-colors hover:text-foreground">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {groups.map((g) => (
                <section key={g.name}>
                  <p className="type-overline mb-2.5 text-[10px] text-muted-foreground">{g.name}</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {g.items.map((item) => {
                      const Icon = ICONS[item.href] ?? LayoutGrid;
                      const active = isActiveNav(pathname, item.href, nav);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex min-h-[92px] flex-col justify-between rounded-2xl border p-4 transition-[transform,border-color,background-color] duration-200 active:scale-[0.97]",
                            active ? "border-primary/60 bg-primary/10" : "border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
                          )}
                        >
                          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active ? "bg-primary text-white" : "bg-white/[0.06] text-foreground/80 group-hover:text-foreground")}>
                            <Icon className="h-[18px] w-[18px]" aria-hidden />
                          </span>
                          <span className="text-sm font-semibold">{item.label}</span>
                          {item.badge ? <Count n={item.badge} className="absolute right-3 top-3" /> : null}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, icon: Icon, children }: { href: string; icon: typeof Home; children: ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-white/[0.06] hover:text-foreground">
      <Icon className="h-4 w-4 text-muted" aria-hidden />
      {children}
    </Link>
  );
}
