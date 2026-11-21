import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
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
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { Rail } from "@/components/dashboard/rail";
import { EventCard } from "@/components/marketing/event-card";
import { isRemoteImage, resolveEventImage } from "@/lib/events/images";
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
  const user = await requireRole(["ADMIN", "COACH"]);
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

  const now2 = requestTime();
  const [lead, ...moreEvents] = upcoming;
  const leadPct = lead?.max_participants ? lead.participant_count / lead.max_participants : null;
  const leadImage = lead ? resolveEventImage({ image_url: lead.image_url, event_type: lead.event_type, is_private_coaching: false }) : null;
  const leadDays = lead ? Math.max(0, Math.ceil((new Date(lead.start_at).getTime() - now2) / 86_400_000)) : null;
  const firstName = user.fullName?.split(" ")[0] ?? "Coach";

  const quick = [
    { href: "/admin/events/new", icon: Plus, label: "New event" },
    { href: "/admin/calendar", icon: CalendarDays, label: "Calendar" },
    { href: "/admin/members", icon: Users, label: "Members" },
    { href: "/admin/reports", icon: Banknote, label: "Reports" },
  ];

  return (
    <div className="flex flex-col gap-10 pb-4">
      {/* Hero scoreboard */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-ink-softer via-ink-soft to-ink p-6 sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-10 h-[130%] w-1/2 -skew-x-12 bg-gradient-to-b from-primary/25 via-primary/5 to-transparent" />
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="animate-fade-up">
              <p className="type-overline text-[11px] text-muted">
                {formatDate(new Date(now2).toISOString(), { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-7xl">
                Today,
                <br />
                <span className="text-primary">{firstName}</span>
              </h1>
            </div>
            <nav aria-label="Period" className="inline-flex w-fit rounded-full border border-white/[0.08] bg-ink/60 p-1">
              {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                <Link
                  key={k}
                  href={`/admin?range=${k}`}
                  aria-current={k === range ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition-colors",
                    k === range ? "bg-foreground text-ink" : "text-muted hover:text-foreground",
                  )}
                >
                  {RANGES[k]}
                </Link>
              ))}
            </nav>
          </div>
          {d ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/admin/reports" className="group rounded-3xl bg-ink/50 p-5 ring-1 ring-white/[0.06] transition-colors hover:ring-success/40 sm:p-6">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-success">
                  <Banknote className="h-4 w-4" aria-hidden /> Confirmed · last {RANGES[range]}
                </span>
                <span className="mt-3 block font-display text-5xl font-bold leading-none tabular sm:text-6xl">{formatTnd(d.income_confirmed)}</span>
                <span className="mt-2 block text-sm text-muted">{d.income_count} payment{d.income_count === 1 ? "" : "s"} you confirmed</span>
              </Link>
              <Link href="/admin/payments" className="group rounded-3xl bg-ink/50 p-5 ring-1 ring-white/[0.06] transition-colors hover:ring-warning/40 sm:p-6">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-warning">
                  <AlertCircle className="h-4 w-4" aria-hidden /> Still to collect
                </span>
                <span className="mt-3 block font-display text-5xl font-bold leading-none tabular sm:text-6xl">{formatTnd(d.outstanding_unpaid)}</span>
                <span className="mt-2 block text-sm text-muted">{d.outstanding_count} active registration{d.outstanding_count === 1 ? "" : "s"}</span>
              </Link>
            </div>
          ) : (
            <p role="alert" className="flex items-center gap-2 rounded-2xl border border-danger/35 bg-danger-soft p-4 text-sm text-red-100">
              <AlertCircle className="h-4 w-4" aria-hidden /> The figures could not be loaded. Refresh to try again.
            </p>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <nav aria-label="Quick actions" className="flex flex-wrap items-start gap-x-3 gap-y-4">
        {quick.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="group flex w-[72px] flex-col items-center gap-2 text-center sm:w-20">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-ink-soft transition-[transform,background-color,border-color] duration-200 group-hover:border-primary/50 group-hover:bg-primary/10 group-active:scale-95 sm:h-[72px] sm:w-[72px]">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-foreground/85">{label}</span>
          </Link>
        ))}
        <div className="ml-auto self-center"><EnterPreviewButton returnTo="/events" /></div>
      </nav>

      {/* Your queue */}
      {d ? (
        <section aria-labelledby="todo-h" className="flex flex-col gap-4">
          <h2 id="todo-h" className="font-display text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">Your queue</h2>
          {attention.length ? (
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    className="group flex h-full min-h-[132px] flex-col justify-between rounded-3xl border border-warning/25 bg-warning-soft p-4 transition-[transform,border-color] duration-200 hover:border-warning/60 active:scale-[0.98] sm:p-5"
                  >
                    <span className="flex items-center justify-between">
                      <a.icon className="h-5 w-5 text-warning" aria-hidden />
                      <ChevronRight className="h-4 w-4 text-warning/70 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-display text-4xl font-bold leading-none text-warning tabular">{a.n}</span>
                      <span className="mt-1 block text-sm leading-snug text-foreground/85">{a.label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-3 rounded-3xl border border-success/25 bg-success-soft px-5 py-4 text-sm text-emerald-200">
              <ClipboardCheck className="h-5 w-5" aria-hidden /> All clear — nothing is waiting on you.
            </p>
          )}
        </section>
      ) : null}

      {/* Next up */}
      <section aria-labelledby="next-h" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="next-h" className="font-display text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">Next up</h2>
          <Link href="/admin/events" className="link-draw text-sm font-semibold text-muted hover:text-foreground">All events</Link>
        </div>
        {lead && leadImage ? (
          <Link href={`/admin/events/${lead.id}`} className="group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[28px] border border-white/[0.08]">
            <div className="zoom-img duotone absolute inset-0">
              <Image src={leadImage} alt="" fill sizes="(min-width: 1200px) 1200px, 100vw" unoptimized={isRemoteImage(leadImage)} className="object-cover" />
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/10" />
            <span className="absolute left-5 top-5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white sm:left-7 sm:top-7">
              {leadDays === 0 ? "Today" : leadDays === 1 ? "Tomorrow" : `In ${leadDays} days`}
            </span>
            <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
              <div className="min-w-0">
                <p className="type-overline text-[11px] text-foreground/75">
                  {formatDate(lead.start_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="mt-2 font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">{lead.title}</p>
              </div>
              <ProgressRing
                value={leadPct ?? 0}
                size={104}
                stroke={10}
                tone={leadPct != null && leadPct >= 1 ? "warning" : "primary"}
                label={lead.max_participants ? `${lead.participant_count} of ${lead.max_participants} places taken` : `${lead.participant_count} registered`}
              >
                <span className="font-display text-2xl font-bold leading-none tabular">
                  {lead.participant_count}
                  {lead.max_participants ? <span className="text-sm text-muted">/{lead.max_participants}</span> : null}
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">places</span>
              </ProgressRing>
            </div>
          </Link>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-[28px] border border-dashed border-white/15 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl font-bold uppercase leading-tight">No upcoming events</p>
              <p className="mt-1 text-sm text-muted">Publish an event and it shows up here with its registrations.</p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto"><Link href="/admin/events/new">Create an event</Link></Button>
          </div>
        )}
      </section>

      {/* Scoreboard */}
      {d ? (
        <Rail id="kpi-h" title={`Last ${RANGES[range]}`}>
          <Kpi icon={UserPlus} label="New members" value={String(d.members_new)} sub={`${d.members_total} in total`} href="/admin/members" />
          <Kpi icon={ClipboardCheck} label="Registrations" value={String(d.registrations_new)} sub={`${d.registrations_waitlisted} waitlisted`} href="/admin/events" />
          <Kpi icon={CalendarDays} label="Upcoming" value={String(d.events_upcoming)} sub={`${d.events_next_7_days} this week · ${d.events_drafts} draft${d.events_drafts === 1 ? "" : "s"}`} href="/admin/events" />
          <Kpi icon={Users} label="Attendances" value={String(d.attendance_recorded)} sub={`${d.events_completed} event${d.events_completed === 1 ? "" : "s"} done`} href="/admin/reports" />
          <Kpi icon={Gift} label="Reward liability" value={formatTnd(d.reward_outstanding_value)} sub={`${d.badges_awarded} badge${d.badges_awarded === 1 ? "" : "s"} awarded`} href="/admin/badges" />
          <Kpi icon={Inbox} label="News published" value={String(d.news_published)} sub={`${d.events_cancelled} cancelled event${d.events_cancelled === 1 ? "" : "s"}`} href="/admin/news" />
        </Rail>
      ) : null}

      {moreEvents.length ? (
        <Rail id="more-events-h" title="Coming up" href="/admin/events">
          {moreEvents.slice(0, 8).map((e) => (
            <div key={e.id} className="w-[82%] shrink-0 snap-start sm:w-[340px]">
              <EventCard event={e} href={`/admin/events/${e.id}`} />
            </div>
          ))}
        </Rail>
      ) : null}

      <section aria-labelledby="audit-h" className="flex flex-col gap-4">
        <h2 id="audit-h" className="font-display text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">Latest activity</h2>
        {audit.data?.length ? (
          <ol className="flex flex-col gap-2">
            {audit.data.map((a) => (
              <li key={a.id} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-ink-soft px-4 py-3.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm first-letter:uppercase">{a.action.replace(/[._]/g, " ")}</span>
                <time dateTime={a.created_at} className="shrink-0 text-xs text-muted">
                  {formatDate(a.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Decisions, payments and edits you make will appear here.</p>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, href }: { icon: typeof Users; label: string; value: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex w-[46%] shrink-0 snap-start flex-col rounded-3xl border border-white/[0.06] bg-ink-soft p-5 transition-[transform,border-color] duration-200 hover:border-white/15 active:scale-[0.98] sm:w-[220px]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] transition-colors group-hover:bg-primary">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="mt-5 font-display text-3xl font-bold leading-none tabular">{value}</span>
      <span className="mt-1.5 text-sm font-semibold">{label}</span>
      <span className="mt-0.5 text-xs text-muted">{sub}</span>
    </Link>
  );
}
