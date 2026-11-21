import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  ClipboardCheck,
  FileSearch,
  Gift,
  Inbox,
  MessageSquare,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getAdminEvents } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { EnterPreviewButton } from "@/components/preview/enter-preview-button";
import { formatTnd } from "@/lib/types/events";
import { cn, formatDate, requestTime } from "@/lib/utils";
import { logError } from "@/lib/errors";

export const metadata: Metadata = { title: "Admin", description: "Fight Zone operations dashboard." };

const RANGES = { "7": "7 days", "30": "30 days", "90": "90 days" } as const;
type RangeKey = keyof typeof RANGES;

interface Props {
  searchParams: Promise<{ range?: string }>;
}

interface Dashboard {
  members_total: number; members_new: number; events_upcoming: number; events_next_7_days: number;
  events_drafts: number; events_completed: number; events_cancelled: number; registrations_pending: number;
  registrations_waitlisted: number; registrations_new: number; proofs_to_review: number; income_confirmed: number;
  income_count: number; outstanding_unpaid: number; outstanding_count: number; attendance_recorded: number;
  unread_messages: number; contact_new: number; news_published: number; badges_awarded: number;
  reward_outstanding_value: number; reward_pending_approval: number;
}

export default async function AdminPage({ searchParams }: Props) {
  await requireRole(["ADMIN", "COACH"]);
  const { range: raw } = await searchParams;
  const range: RangeKey = raw && raw in RANGES ? (raw as RangeKey) : "30";
  const now = requestTime();
  const from = new Date(now - Number(range) * 86_400_000).toISOString();
  const to = new Date(now + 60_000).toISOString();

  const supabase = await createClient();
  const [dashRes, upcoming, audit] = await Promise.all([
    supabase.rpc("get_admin_dashboard", { p_from: from, p_to: to }),
    getAdminEvents({ when: "upcoming", status: "PUBLISHED" }),
    supabase.from("audit_log").select("id, action, target_type, created_at").order("created_at", { ascending: false }).limit(8),
  ]);
  if (dashRes.error) logError("Query failed: admin dashboard", dashRes.error);
  const d = (dashRes.data ?? null) as unknown as Dashboard | null;

  const attention = d
    ? [
        { n: d.registrations_pending, label: "registration request(s) to decide", href: "/admin/events?show=upcoming", icon: ClipboardCheck },
        { n: d.proofs_to_review, label: "payment proof(s) to review", href: "/admin/payments", icon: FileSearch },
        { n: d.unread_messages, label: "unread message(s)", href: "/admin/messages", icon: MessageSquare },
        { n: d.contact_new, label: "new contact form message(s)", href: "/admin/inbox", icon: Inbox },
        { n: d.reward_pending_approval, label: "reward(s) awaiting approval", href: "/admin/badges", icon: Gift },
      ].filter((a) => a.n > 0)
    : [];

  const rangeNav = (
    <nav aria-label="Period" className="inline-flex rounded-lg border border-ink-border bg-ink-soft p-1">
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <Link
          key={k}
          href={`/admin?range=${k}`}
          aria-current={k === range ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold transition-colors",
            k === range ? "bg-foreground text-ink" : "text-muted hover:text-foreground",
          )}
        >
          {RANGES[k]}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Coach console"
        title="Overview"
        description="Live figures from your records. Income counts only the payments you confirmed."
        actions={
          <>
            <Button asChild><Link href="/admin/events/new"><Plus className="h-4 w-4" aria-hidden /> New event</Link></Button>
            <EnterPreviewButton returnTo="/events" />
          </>
        }
      />

      {!d ? (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-danger/35 bg-danger-soft p-4 text-sm text-red-100">
          <AlertCircle className="h-4 w-4" aria-hidden /> The figures could not be loaded. Refresh to try again.
        </p>
      ) : (
        <>
          <section aria-labelledby="todo-h" className="flex flex-col gap-3">
            <h2 id="todo-h" className={cn("type-overline text-[11px]", attention.length ? "text-warning" : "text-muted")}>
              Needs your attention
            </h2>
            {attention.length ? (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className="group flex h-full items-center gap-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-3.5 transition-colors hover:border-warning/60"
                    >
                      <span className="font-display text-3xl font-bold leading-none text-warning tabular">{a.n}</span>
                      <span className="min-w-0 flex-1 text-sm leading-snug">{a.label}</span>
                      <a.icon className="h-4 w-4 shrink-0 text-warning/80 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-md border border-success/25 bg-success-soft px-4 py-3 text-sm text-emerald-200">
                <ClipboardCheck className="h-4 w-4" aria-hidden /> All caught up — nothing is waiting on you.
              </p>
            )}
          </section>

          <section aria-labelledby="kpi-h" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="kpi-h" className="type-overline text-[11px] text-muted">Last {RANGES[range]}</h2>
              {rangeNav}
            </div>

            {/* Money first: the two figures Seif acts on, set large. */}
            <div className="grid overflow-hidden rounded-lg border border-ink-border bg-ink-soft sm:grid-cols-2">
              <Link href="/admin/reports" className="group relative flex flex-col gap-2 p-6 transition-colors hover:bg-white/[0.02] sm:p-7">
                <span className="type-overline flex items-center gap-2 text-[11px] text-muted">
                  <Banknote className="h-4 w-4 text-success" aria-hidden /> Confirmed income
                </span>
                <span className="font-display text-5xl font-bold leading-none tabular sm:text-6xl">{formatTnd(d.income_confirmed)}</span>
                <span className="text-sm text-muted">{d.income_count} payment{d.income_count === 1 ? "" : "s"} confirmed by you</span>
                <span className="absolute inset-x-6 bottom-0 h-[3px] -skew-x-12 bg-success/70 sm:inset-x-7" aria-hidden />
              </Link>
              <Link href="/admin/payments" className="group relative flex flex-col gap-2 border-t border-ink-border p-6 transition-colors hover:bg-white/[0.02] sm:border-l sm:border-t-0 sm:p-7">
                <span className="type-overline flex items-center gap-2 text-[11px] text-muted">
                  <AlertCircle className="h-4 w-4 text-warning" aria-hidden /> Still unpaid
                </span>
                <span className="font-display text-5xl font-bold leading-none tabular sm:text-6xl">{formatTnd(d.outstanding_unpaid)}</span>
                <span className="text-sm text-muted">{d.outstanding_count} active registration{d.outstanding_count === 1 ? "" : "s"} with payment due</span>
                <span className="absolute inset-x-6 bottom-0 h-[3px] -skew-x-12 bg-warning/70 sm:inset-x-7" aria-hidden />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Kpi icon={UserPlus} label="New members" value={String(d.members_new)} sub={`${d.members_total} in total`} href="/admin/members" />
              <Kpi icon={ClipboardCheck} label="Registrations" value={String(d.registrations_new)} sub={`${d.registrations_waitlisted} waitlisted`} href="/admin/events" />
              <Kpi icon={CalendarDays} label="Upcoming events" value={String(d.events_upcoming)} sub={`${d.events_next_7_days} this week · ${d.events_drafts} draft${d.events_drafts === 1 ? "" : "s"}`} href="/admin/events" />
              <Kpi icon={Users} label="Attendances" value={String(d.attendance_recorded)} sub={`${d.events_completed} completed event${d.events_completed === 1 ? "" : "s"}`} href="/admin/reports" />
              <Kpi icon={Gift} label="Reward liability" value={formatTnd(d.reward_outstanding_value)} sub={`${d.badges_awarded} badge${d.badges_awarded === 1 ? "" : "s"} awarded`} href="/admin/badges" />
              <Kpi icon={Inbox} label="News published" value={String(d.news_published)} sub={`${d.events_cancelled} event${d.events_cancelled === 1 ? "" : "s"} cancelled`} href="/admin/news" />
            </div>
          </section>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section aria-labelledby="next-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="next-h" className="type-overline text-[11px] text-muted">Next events</h2>
            <Link href="/admin/events" className="link-draw text-xs font-semibold">All events</Link>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-ink-border overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
              {upcoming.slice(0, 6).map((e) => {
                const pct = e.max_participants ? Math.min(100, Math.round((e.participant_count / e.max_participants) * 100)) : null;
                return (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
                      <span className="w-11 shrink-0 text-center">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{formatDate(e.start_at, { month: "short" })}</span>
                        <span className="block font-display text-2xl font-bold leading-none">{formatDate(e.start_at, { day: "numeric" })}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.title}</span>
                        <span className="text-xs text-muted">{formatDate(e.start_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                      </span>
                      <span className="w-24 shrink-0 text-right">
                        <span className="block text-xs text-muted tabular">
                          {e.max_participants ? `${e.participant_count}/${e.max_participants}` : `${e.participant_count}`} places
                        </span>
                        {pct != null ? (
                          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-ink-softer" aria-hidden>
                            <span className={cn("block h-full", pct >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<CalendarDays />} title="No upcoming events" description="Publish an event and it will show up here with its registrations." actionLabel="Create an event" actionHref="/admin/events/new" />
          )}
        </section>
        <section aria-labelledby="audit-h" className="flex flex-col gap-3">
          <h2 id="audit-h" className="type-overline text-[11px] text-muted">Recent activity</h2>
          {audit.data?.length ? (
            <ol className="relative flex flex-col rounded-lg border border-ink-border bg-ink-soft px-5 py-3">
              {audit.data.map((a) => (
                <li key={a.id} className="relative flex items-start gap-3 py-2.5 pl-5 text-sm before:absolute before:left-[3px] before:top-0 before:h-full before:w-px before:bg-ink-border first:before:top-4 last:before:h-4">
                  <span className="absolute left-0 top-[15px] h-[7px] w-[7px] rounded-full bg-primary ring-4 ring-ink-soft" aria-hidden />
                  <span className="min-w-0 flex-1 truncate first-letter:uppercase">{a.action.replace(/[._]/g, " ")}</span>
                  <time dateTime={a.created_at} className="shrink-0 text-xs text-muted">
                    {formatDate(a.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={<ClipboardCheck />} title="No activity yet" description="Decisions, payments and edits you make are logged here." />
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, href }: { icon: typeof Users; label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="group lift flex flex-col rounded-lg border border-ink-border bg-ink-soft p-4">
      <span className="flex items-center gap-2 text-xs text-muted">
        <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden />
        {label}
      </span>
      <span className="mt-3 font-display text-2xl font-bold leading-none tabular">{value}</span>
      <span className="mt-1.5 text-xs text-muted-foreground">{sub}</span>
    </Link>
  );
}
