"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, MailCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setMyAvatar } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = 2 * 1024 * 1024;

/** Downscales to ≤512px (keeps uploads small) then uploads to avatars/<uid>/. */
async function resize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize"))), "image/webp", 0.86));
}

function initials(name: string | null, email: string) {
  const src = (name ?? "").trim() || email.split("@")[0];
  return src.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "FZ";
}

interface Props {
  userId: string;
  name: string | null;
  email: string;
  url: string | null;
  /** e.g. "Member" or "Profile pending". */
  status: string;
}

/**
 * Profile identity header: big avatar (tap or drop a photo on it), name,
 * email and status, with Change / Remove actions. Centred on phones,
 * a row from `sm` up.
 */
export function AvatarUploader({ userId, name, email, url, status }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [armed, setArmed] = useState(false); // Remove needs a second tap
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);

  const shown = preview ?? url;

  const pick = async (file?: File) => {
    if (!file || busy) return;
    if (!TYPES.includes(file.type)) return void toast.error("Use a PNG, JPEG or WebP image.");
    if (file.size > 10 * 1024 * 1024) return void toast.error("That image is too large (10 MB max).");
    setBusy("upload");
    setPreview(URL.createObjectURL(file));
    try {
      const blob = await resize(file);
      if (blob.size > MAX) throw new Error("That image is too large.");
      const path = `avatars/${userId}/${Date.now()}.webp`;
      const { error } = await createClient().storage.from("fightzone-public").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      const res = await setMyAvatar(path);
      if (!res.ok) throw new Error(res.message);
      toast.success("Photo updated");
      router.refresh();
    } catch (e) {
      setPreview(null);
      toast.error(e instanceof Error && e.message && e.message.length < 120 ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    setBusy("remove");
    const r = await setMyAvatar(null);
    setBusy(null);
    if (r.ok) {
      setPreview(null);
      toast.success("Photo removed");
      router.refresh();
    } else toast.error(r.message ?? "Could not remove the photo.");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void pick(e.dataTransfer.files?.[0]);
  };

  const pill =
    "inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm sm:px-5 font-semibold transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60";

  return (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
      {/* Avatar — the whole circle is the "change photo" target */}
      <div
        className="relative shrink-0"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={Boolean(busy)}
          aria-label={shown ? "Change profile photo" : "Add a profile photo"}
          className={cn(
            "group relative block h-28 w-28 overflow-hidden rounded-full p-[3px] transition-transform duration-200 active:scale-[0.97] sm:h-32 sm:w-32",
            "bg-gradient-to-br from-primary via-primary/60 to-white/10",
            dragging && "scale-105",
          )}
        >
          <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-ink-soft bg-ink">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-4xl font-bold tracking-tight text-foreground/90">{initials(name, email)}</span>
            )}
            {/* hover / drop veil */}
            <span
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-xs font-semibold uppercase tracking-wider text-white opacity-0 transition-opacity duration-200",
                "group-hover:opacity-100 group-focus-visible:opacity-100",
                (dragging || busy) && "opacity-100",
              )}
              aria-hidden
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              {busy === "upload" ? "Uploading" : busy === "remove" ? "Removing" : dragging ? "Drop it" : shown ? "Change" : "Add photo"}
            </span>
          </span>
        </button>
        {/* camera badge — always visible affordance, esp. on touch */}
        <span
          className="pointer-events-none absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-[var(--shadow-hit)] ring-4 ring-ink-soft sm:bottom-1.5 sm:right-1.5"
          aria-hidden
        >
          <Camera className="h-4 w-4" />
        </span>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>

      {/* Identity + actions */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
        <div className="flex min-w-0 max-w-full flex-col items-center gap-1.5 sm:items-start">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            <MailCheck className="h-3.5 w-3.5 text-primary-readable" aria-hidden />
            {status}
          </span>
          <p className="max-w-full truncate font-display text-3xl font-bold uppercase leading-none tracking-tight sm:text-4xl">
            {name?.trim() || "Your name"}
          </p>
          <p className="max-w-full truncate text-sm text-muted" title={email}>{email}</p>
        </div>

        <div className="flex w-full flex-wrap justify-center gap-2 sm:w-auto sm:justify-start">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={Boolean(busy)}
            className={cn(pill, "flex-1 bg-foreground text-ink hover:bg-foreground/90 sm:flex-none")}
          >
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
            {busy === "upload" ? "Uploading…" : shown ? "Change photo" : "Add photo"}
          </button>
          {url ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={Boolean(busy)}
              aria-live="polite"
              className={cn(
                pill,
                "flex-1 border sm:flex-none",
                armed
                  ? "border-danger/60 bg-danger/15 text-danger hover:bg-danger/25"
                  : "border-white/10 text-muted hover:border-white/20 hover:text-foreground",
              )}
            >
              {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
              {armed ? "Tap to confirm" : "Remove"}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG or WebP · <span className="max-sm:hidden">drag a photo onto the circle or click it · </span>shown to Coach Seif in Messages.
        </p>
      </div>
    </div>
  );
}
