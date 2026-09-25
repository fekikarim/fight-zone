"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { uploadContentImage } from "@/lib/actions/uploads";
import {
  CONTENT_IMAGE_MAX_BYTES,
  CONTENT_IMAGE_MIME_TYPES,
  type ContentImageKind,
} from "@/lib/validations/uploads";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  /** Form field name carrying the final public URL (e.g. "cover_image_url"). */
  name: string;
  /** Storage folder + helper copy. */
  kind: ContentImageKind;
  /** Existing image URL (edit forms). */
  defaultValue?: string | null;
  label?: string;
}

const KIND_COPY: Record<ContentImageKind, { subject: string }> = {
  news: { subject: "article" },
  events: { subject: "event" },
};

const MAX_MB = CONTENT_IMAGE_MAX_BYTES / (1024 * 1024);

function clientCheck(file: File): string | null {
  if (!(CONTENT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Only PNG, JPEG, WebP or GIF images are allowed.";
  }
  if (file.size <= 0) return "The file is empty.";
  if (file.size > CONTENT_IMAGE_MAX_BYTES) {
    return `Image must be at most ${MAX_MB} MB.`;
  }
  return null;
}

export function ImageUploadField({ name, kind, defaultValue, label }: ImageUploadFieldProps) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Revoke object URLs to avoid leaking memory on replace/unmount.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const upload = useCallback(
    async (file: File) => {
      const problem = clientCheck(file);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      setUploading(true);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      try {
        const formData = new FormData();
        formData.set("kind", kind);
        formData.set("file", file);
        const result = await uploadContentImage(formData);
        if (!result.ok || !result.url) {
          setError(result.message ?? "Upload failed. Please try again.");
          setPreview((old) => {
            if (old) URL.revokeObjectURL(old);
            return null;
          });
          return;
        }
        setUrl(result.url);
      } catch {
        setError("Upload failed. Please try again.");
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
      } finally {
        setUploading(false);
      }
    },
    [kind],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && !uploading) void upload(file);
    },
    [upload, uploading],
  );

  const clear = useCallback(() => {
    setUrl("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const shown = preview ?? (url || null);

  return (
    <div className="space-y-1.5">
      {label ? (
        <span className="text-sm font-medium">{label}</span>
      ) : null}
      <input type="hidden" name={name} value={url} />
      <div
        role="button"
        tabIndex={0}
        aria-label={label ?? "Upload image"}
        aria-disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/10"
            : error
              ? "border-destructive/50 bg-destructive/5"
              : url
                ? "border-primary/40 bg-primary/5"
                : "border-ink-border bg-ink-soft/20 hover:border-primary/30",
          uploading && "pointer-events-none",
        )}
      >
        {shown ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shown}
              alt="Uploaded preview"
              className="max-h-44 rounded-lg object-contain"
            />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink-base/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <CheckCircle2 className="h-3 w-3" />
                Ready
              </span>
            )}
            {!uploading ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-muted transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-soft">
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <ImagePlus className="h-7 w-7 text-muted" />
              )}
            </span>
            <span>
              <span className="text-sm font-medium">
                {uploading ? "Uploading…" : "Click to browse or drag and drop"}
              </span>
              <span className="mt-1 block text-xs text-muted">
                PNG, JPEG, WebP or GIF · max {MAX_MB} MB
              </span>
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={CONTENT_IMAGE_MIME_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Optional — leave it empty and the default {KIND_COPY[kind].subject} image
        will be used instead.
      </p>
    </div>
  );
}
