"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";

/** Points the profile at an avatar already uploaded to avatars/<uid>/ (validated in SQL). */
export async function setMyAvatar(path: string | null): Promise<{ ok: boolean; message?: string }> {
  if (path !== null && !z.string().min(10).max(300).safeParse(path).success) return { ok: false, message: "Invalid file." };
  await requireUser();
  const supabase = await createClient();
  // set_my_avatar(NULL) clears the photo; generated types can't express a
  // nullable SQL argument, hence the narrow cast on this one parameter.
  const { error } = await supabase.rpc("set_my_avatar", { p_path: path as string });
  if (error) {
    if (error.code !== "22023") logError("Failed to set avatar", error);
    return { ok: false, message: error.code === "22023" ? error.message : "We could not update your photo." };
  }
  revalidatePath("/member", "layout");
  return { ok: true };
}
