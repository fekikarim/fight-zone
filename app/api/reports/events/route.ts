import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { parseReportRange, toCsv } from "@/lib/reports";

/** Per-event utilization CSV (staff only). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some((r) => r === "ADMIN" || r === "COACH")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const { fromIso, toIso, fromDay, toDay } = parseReportRange(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_report", { p_from: fromIso, p_to: toIso });
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 500 });
  const csv = toCsv([
    ["Event", "Start", "Status", "Category", "Capacity", "Confirmed", "Pending", "Waitlisted", "Cancelled/declined", "Attended", "No-show", "Paid", "Confirmed income (TND)", "Unpaid (TND)"],
    ...(data ?? []).map((r) => [r.title, r.start_at, r.status, r.category, r.capacity, r.confirmed, r.pending, r.waitlisted, r.cancelled, r.attended, r.no_show, r.paid_count, Number(r.income).toFixed(3), Number(r.outstanding).toFixed(3)]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fight-zone-events-${fromDay}-to-${toDay}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
