import { signOut } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export async function POST() {
  await signOut();
  redirect("/");
}