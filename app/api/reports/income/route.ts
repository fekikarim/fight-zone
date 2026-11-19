import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { getIncomeLedger } from "@/lib/payments/queries";
import { parseReportRange, toCsv } from "@/lib/reports";

/** Income ledger CSV (staff only; same filters as the report page). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.some((r) => r === "ADMIN" || r === "COACH")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const { fromIso, toIso, fromDay, toDay } = parseReportRange(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);
  const { entries, total } = await getIncomeLedger(fromIso, toIso);
  const csv = toCsv([
    ["Paid at", "Member", "Event", "Method", "Amount (TND)", "Note"],
    ...entries.map((e) => [e.paid_at, e.member_name, e.event_title, e.method === "CASH" ? "In person" : e.method === "BANK_TRANSFER" ? "Bank transfer" : e.method, e.amount.toFixed(3), e.note]),
    [],
    ["Total confirmed receipts", "", "", "", total.toFixed(3), ""],
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fight-zone-income-${fromDay}-to-${toDay}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
