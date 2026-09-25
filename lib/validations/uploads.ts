import { z } from "zod";

/**
 * Validation contract for Coach image uploads (news covers, event images).
 * Client checks mirror these for instant feedback; the server action
 * re-validates everything including magic bytes — never trust the client.
 */

/** 5 MB — plenty for cover art, keeps function payloads and storage lean. */
export const CONTENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const CONTENT_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type ContentImageMime = (typeof CONTENT_IMAGE_MIME_TYPES)[number];

/** Storage folder per surface (public bucket `fightzone-public`). */
export const CONTENT_IMAGE_KINDS = ["news", "events"] as const;
export type ContentImageKind = (typeof CONTENT_IMAGE_KINDS)[number];

export const uploadContentImageSchema = z.object({
  kind: z.enum(CONTENT_IMAGE_KINDS),
  file: z
    .instanceof(File, { message: "An image file is required." })
    .refine((f) => f.size > 0, "The file is empty.")
    .refine(
      (f) => f.size <= CONTENT_IMAGE_MAX_BYTES,
      "Image must be at most 5 MB.",
    )
    .refine(
      (f) =>
        (CONTENT_IMAGE_MIME_TYPES as readonly string[]).includes(f.type),
      "Only PNG, JPEG, WebP or GIF images are allowed.",
    ),
});

export type UploadContentImageInput = z.infer<typeof uploadContentImageSchema>;
