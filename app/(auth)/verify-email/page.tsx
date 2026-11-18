import { redirect } from "next/navigation";

/**
 * Email verification was removed — new accounts are usable immediately.
 * Old links (emails, bookmarks) land on the member area instead; signed-out
 * visitors are sent on to sign-in by the member layout.
 */
export default function VerifyEmailPage() {
  redirect("/member");
}
