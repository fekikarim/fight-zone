"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";
import { pageContentSchema } from "@/lib/cms/blocks";

export interface CmsActionState {
  ok: boolean;
  message?: string;
  /** "blocks.3.title" → message, for highlighting the faulty block. */
  issues?: Array<{ path: string; message: string }>;
}

const SLUGS = ["about"] as const;
const slugSchema = z.enum(SLUGS);

function validate(raw: string) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false as const, error: { ok: false, message: "The page data is corrupted. Reload and try again." } };
  }
  const parsed = pageContentSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        ok: false,
        message: "Some blocks need attention before saving.",
        issues: parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  }
  return { ok: true as const, content: parsed.data };
}

/** Saves the draft (never visible publicly until published). */
export async function saveCmsDraft(slug: string, raw: string): Promise<CmsActionState> {
  const s = slugSchema.safeParse(slug);
  if (!s.success) return { ok: false, message: "Unknown page." };
  const v = validate(raw);
  if (!v.ok) return v.error;
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("cms_pages")
    .update({ draft: v.content, draft_updated_at: new Date().toISOString(), draft_updated_by: user.id })
    .eq("slug", s.data);
  if (error) {
    logError("Failed to save CMS draft", error, { slug });
    return { ok: false, message: "We could not save the draft." };
  }
  revalidatePath("/admin/content/about");
  return { ok: true, message: "Draft saved" };
}

/** Saves then publishes (creates an immutable revision). */
export async function publishCmsPage(slug: string, raw: string, note?: string): Promise<CmsActionState> {
  const saved = await saveCmsDraft(slug, raw);
  if (!saved.ok) return saved;
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_page", { p_slug: slug, p_note: note?.slice(0, 200) });
  if (error) {
    logError("Failed to publish CMS page", error, { slug });
    return { ok: false, message: "We could not publish the page." };
  }
  revalidatePath(`/${slug}`);
  revalidatePath("/admin/content/about");
  return { ok: true, message: "Published — the public page is updated" };
}

/** Loads a previous revision into the draft (publish to make it live). */
export async function restoreCmsRevision(revisionId: string): Promise<CmsActionState> {
  if (!z.guid().safeParse(revisionId).success) return { ok: false, message: "Invalid revision." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_page_revision", { p_revision_id: revisionId });
  if (error) {
    logError("Failed to restore CMS revision", error);
    return { ok: false, message: "We could not restore that version." };
  }
  revalidatePath("/admin/content/about");
  return { ok: true, message: "Version loaded into the draft — review it, then publish" };
}
