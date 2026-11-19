import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { AuthenticationError, logError } from "@/lib/errors";
import type { PaymentSubmissionStatus } from "@/lib/types/events";

export interface PaymentSubmissionItem {
  id: string;
  status: PaymentSubmissionStatus;
  amount_declared: number;
  amount_due: number;
  transfer_reference: string | null;
  member_note: string | null;
  proof_mime: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  registration_id: string;
  registration_status: string;
  event_id: string;
  event_title: string;
  event_start: string;
  member_id: string;
  member_name: string | null;
  member_email: string | null;
}

/** Payment-proof queue (staff; RLS also lets members read their own). */
export const getPaymentSubmissions = cache(
  async (status: PaymentSubmissionStatus = "SUBMITTED", limit = 100): Promise<PaymentSubmissionItem[]> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payment_submissions")
      .select(
        `id, status, amount_declared, transfer_reference, member_note, proof_mime, rejection_reason, created_at, reviewed_at,
         registration_id, member_id,
         member:profiles!payment_submissions_member_id_fkey ( full_name, email ),
         registration:event_participants!payment_submissions_registration_id_fkey (
           registration_status, amount_due_tnd, event:events ( id, title, start_at ) )`,
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "SUBMITTED" })
      .limit(limit);
    if (error) {
      logError("Query failed: payment submissions", error, { status });
      return [];
    }
    type Row = {
      id: string; status: PaymentSubmissionStatus; amount_declared: number; transfer_reference: string | null;
      member_note: string | null; proof_mime: string; rejection_reason: string | null; created_at: string;
      reviewed_at: string | null; registration_id: string; member_id: string;
      member: { full_name: string | null; email: string } | null;
      registration: { registration_status: string; amount_due_tnd: number; event: { id: string; title: string; start_at: string } | null } | null;
    };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      status: r.status,
      amount_declared: Number(r.amount_declared),
      amount_due: Number(r.registration?.amount_due_tnd ?? 0),
      transfer_reference: r.transfer_reference,
      member_note: r.member_note,
      proof_mime: r.proof_mime,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
      reviewed_at: r.reviewed_at,
      registration_id: r.registration_id,
      registration_status: r.registration?.registration_status ?? "",
      event_id: r.registration?.event?.id ?? "",
      event_title: r.registration?.event?.title ?? "Event",
      event_start: r.registration?.event?.start_at ?? r.created_at,
      member_id: r.member_id,
      member_name: r.member?.full_name ?? null,
      member_email: r.member?.email ?? null,
    }));
  },
);

export interface IncomeEntry {
  id: string;
  amount: number;
  method: string | null;
  paid_at: string | null;
  note: string | null;
  member_name: string | null;
  event_title: string | null;
  event_id: string | null;
}

/** Income ledger: only payments Seif explicitly confirmed/recorded. */
export const getIncomeLedger = cache(
  async (fromIso: string, toIso: string): Promise<{ entries: IncomeEntry[]; total: number }> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select(
        `id, amount, payment_method, paid_at, note,
         member:member_profiles ( profiles ( full_name ) ),
         registration:event_participants!payments_registration_id_fkey ( event:events ( id, title ) )`,
      )
      .eq("status", "PAID")
      .not("registration_id", "is", null)
      .gte("paid_at", fromIso)
      .lt("paid_at", toIso)
      .order("paid_at", { ascending: false })
      .limit(1000);
    if (error) {
      logError("Query failed: income ledger", error);
      return { entries: [], total: 0 };
    }
    type Row = {
      id: string; amount: number; payment_method: string | null; paid_at: string | null; note: string | null;
      member: { profiles: { full_name: string | null } | null } | null;
      registration: { event: { id: string; title: string } | null } | null;
    };
    const entries = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      method: r.payment_method,
      paid_at: r.paid_at,
      note: r.note,
      member_name: r.member?.profiles?.full_name ?? null,
      event_title: r.registration?.event?.title ?? null,
      event_id: r.registration?.event?.id ?? null,
    }));
    // Sum in millimes (integers) to avoid floating-point drift.
    const totalMillimes = entries.reduce((s, e) => s + Math.round(e.amount * 1000), 0);
    return { entries, total: totalMillimes / 1000 };
  },
);

/** Proofs awaiting review (nav badge). Decorative: 0 on failure. */
export const getPendingProofCount = cache(async (): Promise<number> => {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("payment_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "SUBMITTED");
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
});
