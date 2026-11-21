"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  Trophy,
  Star,
  MessageSquare,
  Bell,
  User,
  Newspaper,
  ArrowUpRight,
  Menu,
  X,
  CalendarDays,
  FileText,
  LayoutGrid,
  Wallet,
  Users,
  BarChart3,
  Settings,
  Medal,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FreshnessDot } from "@/components/content/freshness-dot";
import { LiveUpdates } from "@/components/dashboard/live-updates";
import type { ContentMarker } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth/guards";

export interface DashboardNavLink {
  href: string;
  label: string;
  /** Optional count rendered as a pill (e.g. unread messages). */
  badge?: number;
  /** Sidebar group heading this item belongs to. */
  group?: string;
}

interface DashboardShellProps {
  user: CurrentUser;
  nav: DashboardNavLink[];
  children: ReactNode;
  /** "New content" snapshot for nav indicators (member dashboards). */
  freshness?: {
    news: ContentMarker | null;
    events: ContentMarker | null;
  } | null;
}

/** Pages that clear each feed's indicator (shared seen-key per feed). */
const EVENTS_HREFS = ["/events", "/member/events"];

const ICON = "h-[18px] w-[18px] shrink-0";
const NAV_ICONS: Record<string, ReactNode> = {
  "/member": <LayoutDashboard className={ICON} />,
  "/member/schedule": <CalendarClock className={ICON} />,
  "/member/events": <Trophy className={ICON} />,
  "/member/achievements": <Medal className={ICON} />,
  "/member/reviews": <Star className={ICON} />,
  "/member/messages": <MessageSquare className={ICON} />,
  "/member/notifications": <Bell className={ICON} />,
  "/member/profile": <User className={ICON} />,
  "/admin": <LayoutDashboard className={ICON} />,
  "/admin/events": <Trophy className={ICON} />,
  "/admin/calendar": <CalendarDays className={ICON} />,
  "/admin/payments": <Wallet className={ICON} />,
  "/admin/members": <Users className={ICON} />,
  "/admin/reports": <BarChart3 className={ICON} />,
  "/admin/badges": <Medal className={ICON} />,
  "/admin/settings": <Settings className={ICON} />,
  "/admin/news": <Newspaper className={ICON} />,
  "/admin/reviews": <Star className={ICON} />,
  "/admin/messages": <MessageSquare className={ICON} />,
  "/admin/notifications": <Bell className={ICON} />,
  "/admin/content": <FileText className={ICON} />,
};

/** Up to four destinations in the mobile bottom bar (the rest live under "More"). */
const MOBILE_NAV_PRIMARY = [
  "/member",
  "/member/events",
  "/member/messages",
  "/member/notifications",
  "/admin",
  "/admin/events",
  "/admin/payments",
  "/admin/messages",
];

function isActiveNav(pathname: string, href: string, nav: DashboardNavLink[]): boolean {
  if (pathname === href) return true;
  const rest = pathname.slice(href.length);
  if (!rest.startsWith("/")) return false;
  return !nav.some(
    (other) =>
      other.href !== href &&
      other.href.length > href.length &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}

function CountPill({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-white tabular",
        className,
      )}
    >
      {value > 99 ? "99+" : value}
      <span className="sr-only"> new</span>
    </span>
  );
}

function SidebarNavItem({
  item,
  icon,
  active,
  onClick,
  trailing,
}: {
  item: DashboardNavLink;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
        active ? "bg-white/[0.06] text-foreground" : "text-muted hover:bg-white/[0.03] hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 -skew-x-12 bg-primary transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          active ? "scale-y-100" : "scale-y-0",
        )}
      />
      <span className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
        {icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {trailing}
      {item.badge ? <CountPill value={item.badge} /> : null}
    </Link>
  );
}

function SidebarContent({
  nav,
  pathname,
  onLinkClick,
  userId,
  freshness,
  isStaff,
}: {
  nav: DashboardNavLink[];
  pathname: string;
  onLinkClick?: () => void;
  userId: string | null;
  freshness?: DashboardShellProps["freshness"];
  isStaff: boolean;
}) {
  const dotFor = (href: string) =>
    href === "/member/events" ? (
      <FreshnessDot kind="events" hrefs={EVENTS_HREFS} userId={userId} initial={freshness?.events ?? null} />
    ) : null;

  // Preserve the order in which groups first appear.
  const groups: { name: string; items: DashboardNavLink[] }[] = [];
  for (const item of nav) {
    const name = item.group ?? "";
    const existing = groups.find((g) => g.name === name);
    if (existing) existing.items.push(item);
    else groups.push({ name, items: [item] });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="type-overline mb-5 flex items-center gap-2 px-3 text-[10px] text-muted-foreground">
          <span className="slant-bar h-1 w-3" aria-hidden />
          {isStaff ? "Coach console" : "Member area"}
        </p>
        <nav aria-label={isStaff ? "Admin" : "Member"} className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.name || "main"} className="flex flex-col gap-0.5">
              {group.name ? (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {group.name}
                </p>
              ) : null}
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  icon={NAV_ICONS[item.href] ?? <LayoutGrid className={ICON} />}
                  active={isActiveNav(pathname, item.href, nav)}
                  onClick={onLinkClick}
                  trailing={dotFor(item.href)}
                />
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-ink-border p-4">
        <Link
          href="/"
          onClick={onLinkClick}
          className="group flex min-h-10 items-center gap-3 rounded-md px-3 text-sm text-muted transition-colors hover:bg-white/[0.03] hover:text-foreground"
        >
          <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          View public site
        </Link>
      </div>
    </div>
  );
}

function Avatar({ initials, avatarUrl, className }: { initials: string; avatarUrl?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xs font-bold text-primary ring-1 ring-primary/30",
        className,
      )}
      aria-hidden
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar, already sized by storage
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

export function DashboardShell({ user, nav, children, freshness }: DashboardShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on navigation (adjust state during render).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setDrawerOpen(false);
  }

  // Lock body scroll while the drawer is open; Escape closes it.
  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const initials = (user.fullName ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isActive = (href: string) => isActiveNav(pathname, href, nav);
  const primaryMobileNav = nav.filter((item) => MOBILE_NAV_PRIMARY.includes(item.href));
  const isStaff = user.roles.some((r) => r === "ADMIN" || r === "COACH");
  const notificationsHref = isStaff ? "/admin/notifications" : "/member/notifications";
  const unreadNotifications = nav.find((n) => n.href === notificationsHref)?.badge ?? 0;
  const homeHref = isStaff ? "/admin" : "/member";

  return (
    <div className="flex min-h-dvh">
      <LiveUpdates userId={user.id} role={isStaff ? "staff" : "member"} />

      {/* ─── Desktop sidebar (full height) ─────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-ink-border bg-ink md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-ink-border px-5">
          <Logo variant="full" href={homeHref} />
        </div>
        <SidebarContent nav={nav} pathname={pathname} userId={user.id} freshness={freshness} isStaff={isStaff} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ─── Top bar ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-ink-border bg-background/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                aria-label="Open navigation"
                aria-expanded={drawerOpen}
                aria-controls="dashboard-drawer"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <Logo variant="icon" href={homeHref} />
            </div>
            <p className="hidden text-sm text-muted md:block">
              {isStaff ? "Coach console" : "Welcome back"}
              {user.fullName ? <span className="text-foreground">, {user.fullName.split(" ")[0]}</span> : null}
            </p>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link
                href={notificationsHref}
                aria-label={unreadNotifications ? `Notifications (${unreadNotifications} unread)` : "Notifications"}
                className="relative flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                <Bell className="h-5 w-5" aria-hidden />
                {unreadNotifications ? (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" aria-hidden />
                ) : null}
              </Link>
              <Link
                href={isStaff ? "/admin/settings" : "/member/profile"}
                className="hidden items-center gap-3 rounded-md py-1.5 pl-1.5 pr-3 transition-colors hover:bg-white/[0.04] sm:flex"
              >
                <Avatar initials={initials} avatarUrl={user.avatarUrl} className="h-8 w-8" />
                <span className="hidden flex-col leading-tight xl:flex">
                  <span className="text-sm font-medium text-foreground">{user.fullName ?? "Member"}</span>
                  <span className="text-xs text-muted-foreground">{isStaff ? "Coach" : "Member"}</span>
                </span>
              </Link>
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Bottom padding clears the fixed mobile nav (+ iPhone home indicator). */}
        <main
          id="main"
          className="mx-auto w-full max-w-[1320px] min-w-0 flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 md:pb-12 lg:px-10"
        >
          {children}
        </main>
      </div>

      {/* ─── Mobile drawer ─────────────────────────────────────────── */}
      {drawerOpen && (
        <div id="dashboard-drawer" className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-black/70 animate-[fz-backdrop-in_200ms_ease-out_both]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(20rem,86vw)] flex-col border-r border-ink-border bg-ink shadow-2xl animate-[fz-drawer-in_280ms_var(--ease-out)_both]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-border px-4">
              <Logo variant="full" href={homeHref} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-3 border-b border-ink-border px-5 py-4">
              <Avatar initials={initials} avatarUrl={user.avatarUrl} className="h-10 w-10" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">{user.fullName ?? "Member"}</span>
                <span className="truncate text-xs text-muted">{user.email}</span>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent
                nav={nav}
                pathname={pathname}
                onLinkClick={() => setDrawerOpen(false)}
                userId={user.id}
                freshness={freshness}
                isStaff={isStaff}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile bottom tab bar ─────────────────────────────────── */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-border bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {primaryMobileNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 h-[3px] w-8 -skew-x-12 bg-primary transition-transform duration-200",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
              <span className={active ? "text-primary" : undefined}>{NAV_ICONS[item.href]}</span>
              <span className="max-w-16 truncate text-[11px] font-medium">{item.label}</span>
              {item.badge ? <CountPill value={item.badge} className="absolute left-1/2 top-2 ml-1.5 h-4 min-w-4 px-1 text-[9px]" /> : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="More navigation options"
          aria-expanded={drawerOpen}
          aria-controls="dashboard-drawer"
        >
          <Menu className={ICON} aria-hidden />
          <span className="text-[11px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}
