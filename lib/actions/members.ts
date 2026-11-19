"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";

/** Seif (de)activates a member account; RLS lets staff update profiles. */
export async function setMemberActive(memberId: string, active: boolean): Promise<{ ok: boolean; message?: string }> {
  if (!z.guid().safeParse(memberId).success) return { ok: false, message: "Invalid member." };
  const user = await requireRole(["ADMIN", "COACH"]);
  if (user.id === memberId) return { ok: false, message: "You can't deactivate your own account." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", memberId);
  if (error) {
    logError("Failed to change member status", error, { memberId });
    return { ok: false, message: "We could not update this member." };
  }
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  return { ok: true };
}
