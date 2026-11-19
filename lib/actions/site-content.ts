"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";
import { issuesToFieldErrors, type FieldErrors } from "@/lib/validations/form-errors";

export interface SiteContentState {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
}

// ── FAQ ────────────────────────────────────────────────────────

const faqSchema = z.object({
  id: z.guid().optional(),
  category: z.string().trim().min(2, "Category is required.").max(40),
  question: z.string().trim().min(5, "Write the question (5+ characters).").max(200),
  answer: z.string().trim().min(2, "Write the answer.").max(3000),
  is_published: z.boolean(),
});

export async function saveFaq(_prev: SiteContentState, formData: FormData): Promise<SiteContentState> {
  const parsed = faqSchema.safeParse({
    id: formData.get("id") || undefined,
    category: formData.get("category"),
    question: formData.get("question"),
    answer: formData.get("answer"),
    is_published: formData.get("is_published") === "true",
  });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { id, ...row } = parsed.data;
  let error;
  if (id) {
    ({ error } = await supabase.from("faq_items").update(row).eq("id", id));
  } else {
    const { data: last } = await supabase.from("faq_items").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    ({ error } = await supabase.from("faq_items").insert({ ...row, position: (last?.position ?? 0) + 1 }));
  }
  if (error) {
    logError("Failed to save FAQ", error);
    return { ok: false, message: "We could not save the question." };
  }
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { ok: true, message: id ? "Question saved" : "Question added" };
}

export async function deleteFaq(id: string): Promise<SiteContentState> {
  if (!z.guid().safeParse(id).success) return { ok: false, message: "Invalid question." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  if (error) return { ok: false, message: "We could not delete the question." };
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { ok: true, message: "Question deleted" };
}

/** Swap order with the neighbour (up/down). */
export async function moveFaq(id: string, direction: "up" | "down"): Promise<SiteContentState> {
  if (!z.guid().safeParse(id).success) return { ok: false };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data: items } = await supabase.from("faq_items").select("id, position").order("position").order("created_at");
  const list = items ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // Normalise positions then swap.
  const reordered = [...list];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  for (let k = 0; k < reordered.length; k++) {
    if (reordered[k].position !== k + 1) await supabase.from("faq_items").update({ position: k + 1 }).eq("id", reordered[k].id);
  }
  revalidatePath("/faq");
  revalidatePath("/admin/content/faq");
  return { ok: true };
}

// ── Legal documents ────────────────────────────────────────────

const legalSchema = z.object({
  id: z.guid(),
  title: z.string().trim().min(3, "Title is required.").max(120),
  content: z.string().trim().min(20, "The document is too short.").max(60000),
});

/** New draft version, copied from the latest version (or a provided template). */
export async function createLegalDraft(kind: "privacy" | "terms", template: string): Promise<SiteContentState & { id?: string }> {
  if (kind !== "privacy" && kind !== "terms") return { ok: false, message: "Unknown document." };
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data: existingDraft } = await supabase.from("legal_documents").select("id").eq("kind", kind).eq("status", "DRAFT").maybeSingle();
  if (existingDraft) return { ok: true, id: existingDraft.id, message: "A draft already exists" };
  const { data: latest } = await supabase.from("legal_documents").select("version, title, content").eq("kind", kind).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from("legal_documents").insert({
    kind,
    version: (latest?.version ?? 0) + 1,
    title: latest?.title ?? (kind === "privacy" ? "Privacy Policy" : "Terms of Use"),
    content: latest?.content ?? template,
    created_by: user.id,
  }).select("id").single();
  if (error) {
    logError("Failed to create legal draft", error);
    return { ok: false, message: "We could not create the draft." };
  }
  revalidatePath("/admin/content/legal");
  return { ok: true, id: data.id, message: "Draft created" };
}

export async function saveLegalDraft(_prev: SiteContentState, formData: FormData): Promise<SiteContentState> {
  const parsed = legalSchema.safeParse({ id: formData.get("id"), title: formData.get("title"), content: formData.get("content") });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { id, ...row } = parsed.data;
  // RLS only allows editing DRAFT rows — published versions are immutable.
  const { error, count } = await supabase.from("legal_documents").update(row, { count: "exact" }).eq("id", id).eq("status", "DRAFT");
  if (error || !count) return { ok: false, message: "Only drafts can be edited." };
  revalidatePath("/admin/content/legal");
  return { ok: true, message: "Draft saved" };
}

export async function publishLegal(id: string): Promise<SiteContentState> {
  if (!z.guid().safeParse(id).success) return { ok: false, message: "Invalid document." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_legal_document", { p_id: id });
  if (error) {
    logError("Failed to publish legal document", error);
    return { ok: false, message: "We could not publish this version." };
  }
  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/admin/content/legal");
  return { ok: true, message: "Published — the previous version is kept in history" };
}

// ── Contact inbox ──────────────────────────────────────────────

export async function setContactStatus(id: string, status: "UNREAD" | "READ" | "REPLIED"): Promise<SiteContentState> {
  if (!z.guid().safeParse(id).success || !["UNREAD", "READ", "REPLIED"].includes(status)) return { ok: false };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status, replied_at: status === "REPLIED" ? new Date().toISOString() : null, handled_at: status === "UNREAD" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: "We could not update the message." };
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  return { ok: true, message: status === "REPLIED" ? "Marked as replied" : status === "READ" ? "Marked as read" : "Marked as new" };
}
