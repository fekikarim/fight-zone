"use client";

import { useCallback, useState, useRef } from "react";
import { useActionState } from "react";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMediaRecord } from "@/lib/actions/content";
import type { ContentActionState } from "@/lib/actions/content";
import { createClient } from "@/lib/supabase/client";

interface UploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
}

export function MediaUploadZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<UploadState>({
    file: null,
    preview: null,
    uploading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
  });
  const [meta, setMeta] = useState({ title: "", description: "", type: "IMAGE" as "IMAGE" | "VIDEO" | "DOCUMENT" });

  const [, formAction, isPending] = useActionState(
    async (_prev: ContentActionState, formData: FormData) => {
      if (!upload.uploadedUrl) return { ok: false, message: "Please upload an image first." };
      formData.set("url", upload.uploadedUrl);
      formData.set("type", meta.type);
      const result = await createMediaRecord(_prev, formData);
      if (result.ok) {
        setUpload({ file: null, preview: null, uploading: false, progress: 0, error: null, uploadedUrl: null });
        setMeta({ title: "", description: "", type: "IMAGE" });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return result;
    },
    { ok: false } as ContentActionState,
  );

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setUpload({ file, preview, uploading: true, progress: 0, error: null, uploadedUrl: null });

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error } = await supabase.storage
        .from("fightzone-public")
        .upload(filePath, file, { upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("fightzone-public")
        .getPublicUrl(filePath);

      // Detect type from MIME
      let detectedType: "IMAGE" | "VIDEO" | "DOCUMENT" = "IMAGE";
      if (file.type.startsWith("video/")) detectedType = "VIDEO";
      else if (!file.type.startsWith("image/")) detectedType = "DOCUMENT";

      setUpload((prev) => ({
        ...prev,
        uploading: false,
        progress: 100,
        uploadedUrl: urlData.publicUrl,
      }));
      setMeta((prev) => ({ ...prev, type: detectedType }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setUpload((prev) => ({
        ...prev,
        uploading: false,
        error: `Upload failed: ${message}`,
      }));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setUpload({ file: null, preview: null, uploading: false, progress: 0, error: null, uploadedUrl: null });
    setMeta({ title: "", description: "", type: "IMAGE" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 transition-colors ${
          upload.uploadedUrl
            ? "border-primary/50 bg-primary/5"
            : upload.error
              ? "border-destructive/50 bg-destructive/5"
              : "border-ink-border bg-ink-soft/20 hover:border-primary/30"
        }`}
      >
        {upload.preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={upload.preview}
              alt="Preview"
              className="max-h-48 rounded-lg object-contain"
            />
            {upload.uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={clearSelection}
              className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-soft">
              <ImageIcon className="h-8 w-8 text-muted" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-muted">
                PNG, JPG, WebP, GIF up to 50MB
              </p>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileSelect}
          aria-label="Upload media file"
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={upload.uploading}
        />
      </div>

      {upload.error ? (
        <p className="text-sm text-destructive">{upload.error}</p>
      ) : null}

      {upload.uploadedUrl ? (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="url" value={upload.uploadedUrl} />
          <input type="hidden" name="type" value={meta.type} />

          <div className="space-y-1.5">
            <label htmlFor="media-title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="media-title"
              name="title"
              value={meta.title}
              onChange={(e) => setMeta((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
              placeholder="Optional title"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="media-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="media-description"
              name="description"
              rows={2}
              value={meta.description}
              onChange={(e) => setMeta((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is_public"
              name="is_public"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-ink-border"
              value="true"
            />
            <label htmlFor="is_public" className="text-sm font-medium">
              Public (visible in gallery)
            </label>
          </div>

          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isPending ? "Saving..." : "Save to library"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
