"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import {
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_VALUE,
  parsePreviewReturnTo,
} from "@/lib/preview";

/**
 * Staff "View as Member" preview mode. The cookie carries NO privileges —
 * every RBAC gate (member layout, participation, admin areas) keeps
 * enforcing roles exactly as before. It only switches public pages into
 * their member-view presentation (banner + return path).
 */
export async function enterMemberPreview(formData: FormData): Promise<never> {
  await requireRole(["ADMIN", "COACH"]);
  const returnTo = parsePreviewReturnTo(formData.get("returnTo"));
  const jar = await cookies();
  jar.set(PREVIEW_COOKIE, PREVIEW_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(returnTo);
}

/** Leaves preview mode and returns to the admin dashboard. */
export async function exitMemberPreview(): Promise<never> {
  await requireRole(["ADMIN", "COACH"]);
  const jar = await cookies();
  jar.delete(PREVIEW_COOKIE);
  redirect("/admin");
}

/** True when the current request carries an active preview cookie. */
export async function isMemberPreview(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(PREVIEW_COOKIE)?.value === PREVIEW_COOKIE_VALUE;
}
