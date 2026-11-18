"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "./notification-item";
import { MarkAllReadButton } from "./mark-all-read-button";
import { NotificationFilters } from "./notification-filters";
import { loadMoreNotifications } from "@/lib/actions/notifications";
import { businessDateKey } from "@/lib/timezone";
import type { NotificationPage, NotificationRow } from "@/lib/types/notifications";

interface NotificationListProps {
  page: NotificationPage;
  role: "member" | "staff";
  unreadCount: number;
  /** Raw `?filter=` value (for empty-state copy). */
  filter: string;
  filters: { type?: string; unreadOnly?: boolean };
}

const EMPTY_COPY: Record<string, { title: string; description: string }> = {
  unread: { title: "No unread notifications", description: "You've read everything. New alerts will show up here." },
  EVENT: { title: "No event notifications", description: "Registrations, cancellations and event updates will appear here." },
  MESSAGE: { title: "No message notifications", description: "New messages will appear here." },
  SYSTEM: { title: "No system notifications", description: "Account and platform updates will appear here." },
};

/** "Today" / "Yesterday" / "Earlier" in the club's timezone. */
function dayGroup(iso: string): string {
  const day = businessDateKey(new Date(iso));
  const today = businessDateKey(new Date());
  const yesterday = businessDateKey(new Date(Date.now() - 86_400_000));
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return "Earlier";
}

function groupItems(items: NotificationRow[]) {
  const groups: { label: string; items: NotificationRow[] }[] = [];
  for (const item of items) {
    const label = dayGroup(item.created_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export function NotificationList({ page, role, unreadCount, filter, filters }: NotificationListProps) {
  const [items, setItems] = useState(page.items);
  const [cursor, setCursor] = useState(page.nextCursor);
  const [loading, startLoading] = useTransition();

  const loadOlder = () => {
    if (!cursor) return;
    startLoading(async () => {
      try {
        const next = await loadMoreNotifications({ ...filters, cursor });
        setItems((prev) => {
          const seen = new Set(prev.map((n) => n.id));
          return [...prev, ...next.items.filter((n) => !seen.has(n.id))];
        });
        setCursor(next.nextCursor);
      } catch {
        toast.error("Could not load older notifications. Please try again.");
      }
    });
  };

  const empty = EMPTY_COPY[filter];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NotificationFilters unreadCount={unreadCount} />
        {unreadCount > 0 ? <MarkAllReadButton /> : null}
      </div>

      {items.length > 0 ? (
        <div className="space-y-6">
          {groupItems(items).map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">{group.label}</h2>
              <ul className="space-y-2">
                {group.items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem notification={n} role={role} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : empty ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title={empty.title} description={empty.description} />
      ) : role === "member" ? (
        <div className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40 p-8 sm:p-14">
          <div className="absolute right-0 top-0 h-full w-full opacity-10 sm:w-1/2">
            <Image
              src="/components/flat-sport-medals-illustration-2000x2000.jpg"
              alt=""
              fill
              className="object-cover object-right grayscale mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-soft via-ink-soft/90 to-transparent sm:hidden" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-soft/40 via-ink-soft/80 to-transparent sm:block" />
          </div>
          <div className="relative z-10 flex max-w-xl flex-col gap-4">
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">You&apos;re in the zone</h2>
            <p className="text-base text-zinc-300">
              No new alerts right now. Event updates and messages from Coach Seif will appear here.
            </p>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications"
          description="You're all caught up. Event registrations, cancellations and new messages will appear here."
        />
      )}

      {cursor ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={loadOlder} disabled={loading} className="w-full gap-2 sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loading ? "Loading…" : "Load older notifications"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
