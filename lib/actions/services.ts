"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import {
  createSessionSchema,
  updateSessionSchema,
  toggleSessionActiveSchema,
} from "@/lib/validations/services";
import { logError } from "@/lib/errors";

export interface SessionActionState {
  ok: boolean;
  message?: string;
  sessionId?: string;
}

function revalidateServices(sessionId?: string) {
  revalidatePath("/services");
  revalidatePath("/coaches");
  revalidatePath("/admin/services");
  if (sessionId) {
    revalidatePath(`/services/${sessionId}`);
    revalidatePath(`/admin/services/${sessionId}`);
  }
}

/**
 * Creates a new session (admin only).
 */
export async function createSession(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = createSessionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    discipline: formData.get("discipline") || undefined,
    level: formData.get("level") || undefined,
    duration_min: formData.get("duration_min"),
    price: formData.get("price"),
    is_active: formData.get("is_active") ?? "true",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { ok: false, message: "Invalid session data.", ...fieldErrors };
  }

  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      discipline: parsed.data.discipline ?? null,
      level: parsed.data.level ?? null,
      duration_min: parsed.data.duration_min,
      price: parsed.data.price,
      is_active: parsed.data.is_active,
      coach_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create session", error, { title: parsed.data.title });
    return { ok: false, message: "Could not create session. Please try again." };
  }

  revalidateServices(data.id);
  return { ok: true, sessionId: data.id, message: "Session created." };
}

/**
 * Updates an existing session (admin only).
 */
export async function updateSession(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = updateSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    discipline: formData.get("discipline") || undefined,
    level: formData.get("level") || undefined,
    duration_min: formData.get("duration_min") || undefined,
    price: formData.get("price") || undefined,
    is_active: formData.get("is_active") ?? undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid session data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { sessionId, ...updates } = parsed.data;

  const payload: {
    title?: string;
    description?: string | null;
    type?: "PERSONAL" | "TECHNICAL" | "PHYSICAL" | "STRATEGY" | "COMBO";
    discipline?: string | null;
    level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL" | null;
    duration_min?: number;
    price?: number;
    is_active?: boolean;
  } = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.discipline !== undefined) payload.discipline = updates.discipline;
  if (updates.level !== undefined) payload.level = updates.level;
  if (updates.duration_min !== undefined) payload.duration_min = updates.duration_min;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;

  const { error } = await supabase
    .from("sessions")
    .update(payload)
    .eq("id", sessionId);

  if (error) {
    logError("Failed to update session", error, { sessionId });
    return { ok: false, message: "Could not update session. Please try again." };
  }

  revalidateServices(sessionId);
  return { ok: true, sessionId, message: "Session updated." };
}

/**
 * Toggles a session's active/inactive status (admin only).
 */
export async function toggleSessionActive(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = toggleSessionActiveSchema.safeParse({
    sessionId: formData.get("sessionId"),
    is_active: formData.get("is_active"),
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .update({ is_active: parsed.data.is_active })
    .eq("id", parsed.data.sessionId);

  if (error) {
    logError("Failed to toggle session", error, { sessionId: parsed.data.sessionId });
    return { ok: false, message: "Could not update session status." };
  }

  revalidateServices(parsed.data.sessionId);
  return {
    ok: true,
    sessionId: parsed.data.sessionId,
    message: parsed.data.is_active ? "Session activated." : "Session deactivated.",
  };
}
