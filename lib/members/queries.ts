import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { AuthenticationError, logError } from "@/lib/errors";

export interface MemberListItem {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Members (accounts holding only the MEMBER role) for Seif's tools.
 * RLS: staff can read profiles; members can only read their own.
 */
export const getMembers = cache(
  async (opts: { q?: string; limit?: number; offset?: number } = {}): Promise<{ items: MemberListItem[]; total: number }> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();
    const supabase = await createClient();
    const { data: staffRows } = await supabase
      .from("user_role_assignments")
      .select("user_id, roles!inner(name)")
      .in("roles.name", ["ADMIN", "COACH"]);
    const staffIds = new Set((staffRows ?? []).map((r) => r.user_id));

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, is_active, created_at", { count: "exact" })
      .order("created_at", { ascending: false });
    if (staffIds.size) query = query.not("id", "in", `(${[...staffIds].join(",")})`);
    if (opts.q) {
      const q = opts.q.replace(/[%_,()]/g, " ").trim();
      if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    }
    const limit = Math.min(opts.limit ?? 50, 200);
    const offset = Math.max(opts.offset ?? 0, 0);
    query = query.range(offset, offset + limit - 1);
    const { data, error, count } = await query;
    if (error) {
      logError("Query failed: members", error);
      return { items: [], total: 0 };
    }
    return { items: data ?? [], total: count ?? 0 };
  },
);
