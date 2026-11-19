import { redirect } from "next/navigation";

/** Members have a single conversation with Seif at /member/messages. */
export default function MemberMessageThreadRedirect() {
  redirect("/member/messages");
}
