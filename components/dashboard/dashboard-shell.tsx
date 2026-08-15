"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/lib/auth/guards";

export interface DashboardNavLink {
  href: string;
  label: string;
}

interface DashboardShellProps {
  user: CurrentUser;
  nav: DashboardNavLink[];
  children: ReactNode;
}

export function DashboardShell({ user, nav, children }: DashboardShellProps) {
  const pathname = usePathname();
  const initials = (user.fullName ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-border bg-background/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo variant="full" tone="light" className="[&_img]:!h-8 [&_img]:!w-auto" />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {initials}
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{user.fullName ?? "Member"}</span>
                <span className="text-xs text-muted">{user.email}</span>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-ink-border bg-ink-soft/30 md:block">
          <nav className="sticky top-16 flex flex-col gap-1 p-4">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-ink-soft hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>

      <nav className="sticky bottom-0 z-30 flex border-t border-ink-border bg-background/90 backdrop-blur md:hidden">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
