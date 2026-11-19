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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Live figures computed from your records. Income counts only payments you confirmed."
        actions={
          <>
            <Button asChild className="gap-2"><Link href="/admin/events/new"><Plus className="h-4 w-4" aria-hidden /> New event</Link></Button>
            <EnterPreviewButton returnTo="/events" />
          </>
        }
      />

      {!d ? (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <AlertCircle className="h-4 w-4" aria-hidden /> The figures could not be loaded. Refresh to try again.
        </p>
      ) : (
        <>
          <section aria-labelledby="todo-h" className="space-y-3">
            <h2 id="todo-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Needs your attention</h2>
            {attention.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/30 px-4 py-3 transition-colors hover:border-primary/60">
                      <a.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                      <span className="text-sm"><strong className="font-display text-lg">{a.n}</strong> {a.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-4 py-3 text-sm text-muted">All caught up — nothing waiting on you.</p>
            )}
          </section>

          <section aria-labelledby="kpi-h" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="kpi-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Last {RANGES[range]}</h2>
              <nav aria-label="Period" className="flex gap-1.5">
                {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                  <Link key={k} href={`/admin?range=${k}`} aria-current={k === range ? "page" : undefined}
                    className={cn("rounded-full border px-3 py-1 text-xs", k === range ? "border-primary bg-primary text-white" : "border-ink-border text-muted hover:text-foreground")}>
                    {RANGES[k]}
                  </Link>
                ))}
              </nav>
            </div>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={Banknote} label="Confirmed income" value={formatTnd(d.income_confirmed)} sub={`${d.income_count} payment(s)`} href="/admin/reports" />
              <Kpi icon={AlertCircle} label="Still unpaid" value={formatTnd(d.outstanding_unpaid)} sub={`${d.outstanding_count} registration(s)`} href="/admin/payments" />
              <Kpi icon={UserPlus} label="New members" value={String(d.members_new)} sub={`${d.members_total} in total`} href="/admin/members" />
              <Kpi icon={ClipboardCheck} label="New registrations" value={String(d.registrations_new)} sub={`${d.registrations_waitlisted} waitlisted`} href="/admin/events" />
              <Kpi icon={CalendarDays} label="Upcoming events" value={String(d.events_upcoming)} sub={`${d.events_next_7_days} in the next 7 days · ${d.events_drafts} draft(s)`} href="/admin/events" />
              <Kpi icon={Users} label="Attendances recorded" value={String(d.attendance_recorded)} sub={`${d.events_completed} completed event(s)`} href="/admin/reports" />
              <Kpi icon={Gift} label="Reward liability" value={formatTnd(d.reward_outstanding_value)} sub={`${d.badges_awarded} badge(s) awarded`} href="/admin/badges" />
              <Kpi icon={Inbox} label="News published" value={String(d.news_published)} sub={`${d.events_cancelled} event(s) cancelled`} href="/admin/news" />
            </dl>
          </section>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="next-h" className="space-y-3">
          <h2 id="next-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Next events</h2>
          {upcoming.length ? (
            <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
              {upcoming.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/events/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-soft/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted">{formatDate(e.start_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {e.max_participants ? `${e.participant_count}/${e.max_participants}` : e.participant_count} places
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-ink-border px-4 py-8 text-center text-sm text-muted">No upcoming published events.</p>
          )}
        </section>
        <section aria-labelledby="audit-h" className="space-y-3">
          <h2 id="audit-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Recent activity</h2>
          {audit.data?.length ? (
            <ul className="divide-y divide-ink-border rounded-xl border border-ink-border text-sm">
              {audit.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="truncate">{a.action.replace(/[._]/g, " ")}</span>
                  <time className="shrink-0 text-xs text-muted">{formatDate(a.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-ink-border px-4 py-8 text-center text-sm text-muted">No recorded activity yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, href }: { icon: typeof Users; label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-ink-border bg-ink-soft/40 p-4 transition-colors hover:border-primary/40">
      <dt className="flex items-center gap-2 text-xs text-muted"><Icon className="h-4 w-4 text-primary" aria-hidden />{label}</dt>
      <dd className="mt-2 font-display text-xl font-bold sm:text-2xl">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted">{sub}</dd>
    </Link>
  );
}
