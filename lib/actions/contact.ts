"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { contactSchema } from "@/lib/validations/contact";
import { logError } from "@/lib/errors";

export interface ContactActionState {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
}

export async function submitContactMessage(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { ok: false, errors };
  }

  // Attach the signed-in member so they can later see their own threads.
  // For anonymous visitors member_id stays NULL (RLS allows it).
  const user = await getCurrentUser();

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    member_id: user?.id ?? null,
  });

  if (error) {
    logError("Failed to insert contact message", error);
    return {
      ok: false,
      message: "Something went wrong on our end. Please try again.",
    };
  }

  return { ok: true, message: "Message sent — I'll get back to you soon." };
}
