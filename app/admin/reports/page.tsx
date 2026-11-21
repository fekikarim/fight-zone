import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getIncomeLedger } from "@/lib/payments/queries";
import { parseReportRange } from "@/lib/reports";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { eventStatusLabel, formatTnd } from "@/lib/types/events";
import { formatDate, requestTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function AdminReportsPage({ searchParams }: Props) {
  await requireRole(["ADMIN", "COACH"]);
  const sp = await searchParams;
  const range = parseReportRange(sp.from, sp.to, requestTime());
  const supabase = await createClient();
  const [report, income] = await Promise.all([
    supabase.rpc("get_event_report", { p_from: range.fromIso, p_to: range.toIso }),
    getIncomeLedger(range.fromIso, range.toIso),
  ]);
  const rows = report.data ?? [];
  const totals = rows.reduce(
    (t, r) => ({
      confirmed: t.confirmed + Number(r.confirmed),
      attended: t.attended + Number(r.attended),
      noShow: t.noShow + Number(r.no_show),
      outstanding: t.outstanding + Math.round(Number(r.outstanding) * 1000),
    }),
    { confirmed: 0, attended: 0, noShow: 0, outstanding: 0 },
  );
  const qs = `from=${range.fromDay}&to=${range.toDay}`;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Insight" title="Reports" description="Registrations, attendance and income for a period. Income lists only payments you recorded or confirmed — never estimates." />

      <form className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs text-muted">From</label>
          <input id="from" name="from" type="date" defaultValue={range.fromDay} className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft px-3 text-base sm:text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs text-muted">To</label>
          <input id="to" name="to" type="date" defaultValue={range.toDay} className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft px-3 text-base sm:text-sm" />
        </div>
        <Button type="submit">Apply</Button>
      </form>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Confirmed receipts", formatTnd(income.total), `${income.entries.length} payment(s)`],
          ["Still unpaid", formatTnd(totals.outstanding / 1000), "active registrations"],
          ["Confirmed places", String(totals.confirmed), `${rows.length} event(s)`],
          ["Attendance", String(totals.attended), `${totals.noShow} no-show(s)`],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-ink-border bg-ink-soft/40 p-4">
            <dt className="text-xs text-muted">{l}</dt>
            <dd className="mt-1 font-display text-xl font-bold sm:text-2xl">{v}</dd>
            <dd className="text-xs text-muted">{s}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3" aria-labelledby="ev-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ev-h" className="font-display text-xl font-semibold uppercase tracking-tight">Events</h2>
          <Button asChild variant="outline" size="sm" className="gap-2"><a href={`/api/reports/events?${qs}`}><Download className="h-4 w-4" aria-hidden /> CSV</a></Button>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto rounded-xl border border-ink-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-ink-soft/60 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Event</th><th className="px-3 py-2">Places</th><th className="px-3 py-2">Pending/Wait</th>
                  <th className="px-3 py-2">Attended</th><th className="px-3 py-2">Paid</th><th className="px-3 py-2 text-right">Income</th><th className="px-3 py-2 text-right">Unpaid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border">
                {rows.map((r) => (
                  <tr key={r.event_id}>
                    <td className="px-3 py-2">
                      <Link href={`/admin/events/${r.event_id}`} className="font-medium hover:text-primary">{r.title}</Link>
                      <span className="block text-xs text-muted">{formatDate(r.start_at, { month: "short", day: "numeric", year: "numeric" })} · {eventStatusLabel[r.status]}</span>
                    </td>
                    <td className="px-3 py-2">{Number(r.confirmed)}{r.capacity ? ` / ${r.capacity}` : ""}</td>
                    <td className="px-3 py-2">{Number(r.pending)} / {Number(r.waitlisted)}</td>
                    <td className="px-3 py-2">{Number(r.attended)}{Number(r.no_show) ? ` (+${Number(r.no_show)} no-show)` : ""}</td>
                    <td className="px-3 py-2">{r.is_free ? "Free" : Number(r.paid_count)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTnd(Number(r.income))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTnd(Number(r.outstanding))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="rounded-xl border border-dashed border-ink-border px-4 py-8 text-center text-sm text-muted">No events in this period.</p>}
      </section>

      <section className="space-y-3" aria-labelledby="inc-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="inc-h" className="font-display text-xl font-semibold uppercase tracking-tight">Income ledger</h2>
          <Button asChild variant="outline" size="sm" className="gap-2"><a href={`/api/reports/income?${qs}`}><Download className="h-4 w-4" aria-hidden /> CSV</a></Button>
        </div>
        {income.entries.length ? (
          <ul className="divide-y divide-ink-border rounded-xl border border-ink-border text-sm">
            {income.entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{e.member_name ?? "Member"} · {e.event_title ?? "Event"}</span>
                  <span className="text-xs text-muted">
                    {e.paid_at ? formatDate(e.paid_at, { month: "short", day: "numeric", year: "numeric" }) : "—"} · {e.method === "CASH" ? "In person" : "Bank transfer"}{e.note ? ` · ${e.note}` : ""}
                  </span>
                </span>
                <span className="font-display text-lg font-bold tabular-nums">{formatTnd(e.amount)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between bg-ink-soft/50 px-4 py-3 font-semibold">
              <span>Total confirmed receipts</span><span className="tabular-nums">{formatTnd(income.total)}</span>
            </li>
          </ul>
        ) : <p className="rounded-xl border border-dashed border-ink-border px-4 py-8 text-center text-sm text-muted">No confirmed payments in this period.</p>}
        <p className="text-xs text-muted">Gross confirmed receipts only. Costs and profit aren&apos;t tracked, so none are shown. Rewards that covered a fee are not income.</p>
      </section>
    </div>
  );
}
