"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import {
  CONTENT_IMAGE_MAX_BYTES,
  CONTENT_IMAGE_MIME_TYPES,
  uploadContentImageSchema,
  type ContentImageKind,
} from "@/lib/validations/uploads";
import { logError } from "@/lib/errors";
import { sniffImageMime } from "@/lib/uploads/image-check";

export interface UploadImageState {
  ok: boolean;
  /** Public URL of the stored image (submit with the parent form). */
  url?: string;
  message?: string;
}

const BUCKET = "fightzone-public";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Staff-only image upload for news covers and event images. The file is
 * validated (presence, size, MIME, magic bytes) and stored in the public
 * bucket under a collision-proof path. Returns the public URL, which the
 * parent form submits as `cover_image_url` / `image_url` — the existing
 * create/update actions are unchanged.
 */
export async function uploadContentImage(
  formData: FormData,
): Promise<UploadImageState> {
  const parsed = uploadContentImageSchema.safeParse({
    kind: formData.get("kind"),
    file: formData.get("file"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid image.",
    };
  }

  await requireRole(["ADMIN", "COACH"]);

  const { kind, file } = parsed.data;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Defense in depth: MIME types are client-declared — verify content.
  if (buffer.length > CONTENT_IMAGE_MAX_BYTES) {
    return { ok: false, message: "Image must be at most 5 MB." };
  }
  if (
    !(CONTENT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type) ||
    !sniffImageMime(new Uint8Array(buffer), file.type)
  ) {
    return {
      ok: false,
      message: "File content does not match its image type.",
    };
  }

  const supabase = await createClient();
  const path = `${kind satisfies ContentImageKind}/${randomUUID()}.${EXT_BY_MIME[file.type]}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    logError("Failed to upload content image", error, { kind });
    return { ok: false, message: "Upload failed. Please try again." };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
