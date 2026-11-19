"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setMyAvatar } from "@/lib/actions/profile";
import { UserAvatar } from "@/components/messages/user-avatar";

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

export function AvatarUploader({ userId, name, url }: { userId: string; name: string | null; url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error("Use a PNG, JPEG or WebP image.");
    if (file.size > 10 * 1024 * 1024) return void toast.error("That image is too large.");
    setBusy(true);
    try {
      const blob = await resize(file);
      if (blob.size > MAX) throw new Error("too large");
      const path = `avatars/${userId}/${Date.now()}.webp`;
      const { error } = await createClient().storage.from("fightzone-public").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      const res = await setMyAvatar(path);
      if (!res.ok) throw new Error(res.message);
      toast.success("Photo updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error && e.message && e.message.length < 120 ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-ink-border" />
        ) : <UserAvatar name={name} size="lg" />}
        {busy ? <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60"><Loader2 className="h-5 w-5 animate-spin" aria-hidden /></span> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-ink-border px-3 py-2 text-sm hover:border-primary/50">
          <Camera className="h-4 w-4" aria-hidden /> {url ? "Change photo" : "Add a photo"}
          <input ref={input} type="file" accept={TYPES.join(",")} className="sr-only" disabled={busy} onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {url ? (
          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            const r = await setMyAvatar(null);
            setBusy(false);
            if (r.ok) { toast.success("Photo removed"); router.refresh(); } else toast.error(r.message ?? "Could not remove.");
          }} className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary"><Trash2 className="h-3 w-3" aria-hidden />Remove</button>
        ) : <span className="text-xs text-muted">PNG, JPEG or WebP. Shown in your conversations with Coach Seif.</span>}
      </div>
    </div>
  );
}
