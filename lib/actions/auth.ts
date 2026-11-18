"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { logError } from "@/lib/errors";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email/resend";

export interface AuthActionState {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logError("Sign-in failed", error);
    return { ok: false, message: "Invalid email or password." };
  }

  revalidatePath("/", "layout");
  redirect("/member");
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { email, password, fullName } = parsed.data;
  const supabase = await createClient();

  // No email verification: the account is created already confirmed and the
  // member is signed straight in. Creating it server-side (service role)
  // makes this independent of the Supabase dashboard's "Confirm email"
  // setting, and no confirmation email is sent.
  let created = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      if (error.code === "email_exists" || error.status === 422) {
        return {
          ok: false,
          message: "An account with this email already exists. Sign in instead, or reset your password.",
        };
      }
      if (error.code === "weak_password") {
        return { ok: false, message: "Please choose a stronger password." };
      }
      logError("Sign-up failed", error);
      return { ok: false, message: "We could not create your account. Please try again." };
    }
    created = true;
  } catch (adminError) {
    // Service-role key missing: fall back to the public sign-up API (works
    // when "Confirm email" is turned off in the Supabase dashboard).
    logError("Admin sign-up unavailable; falling back to public sign-up", adminError);
  }

  if (!created) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      logError("Sign-up failed", error);
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return {
          ok: false,
          message: "An account with this email already exists. Sign in instead, or reset your password.",
        };
      }
      return { ok: false, message: "We could not create your account. Please try again." };
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    logError("Automatic sign-in after sign-up failed", signInError);
    return {
      ok: false,
      message: "Your account was created, but we could not sign you in automatically. Please sign in.",
    };
  }

  // Welcome email is best-effort and never blocks the new member.
  try {
    await sendWelcomeEmail({ to: email, name: fullName });
  } catch (emailError) {
    logError("Failed to send welcome email", emailError);
  }

  revalidatePath("/", "layout");
  redirect("/member");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function forgotPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  // The reset link must point at our own canonical origin. Never derive the
  // redirect target from request headers (open-redirect / code-harvesting).
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  if (error) {
    logError("Password reset request failed", error);
  }

  // Send password reset email
  try {
    await sendPasswordResetEmail({
      to: parsed.data.email,
      resetLink: `${getSiteUrl()}/reset-password`,
    });
  } catch (emailError) {
    // Log email error but don't fail the password reset request
    logError("Failed to send password reset email", emailError);
  }

  // Always return success to avoid leaking which emails exist.
  return {
    ok: true,
    message: "If that email exists, you'll receive a reset link shortly.",
  };
}

/** Exchanges a recovery code from the email link for an active session. */
export async function exchangeRecoveryCode(
  formData: FormData,
): Promise<AuthActionState> {
  const raw = formData.get("code");
  const code = typeof raw === "string" ? raw : "";
  if (!code) return { ok: false, message: "This reset link is missing its code." };

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logError("Recovery code exchange failed", error);
    return { ok: false, message: "This reset link is invalid or has expired." };
  }

  return { ok: true };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Your password reset link is invalid or has expired.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logError("Password update failed", error);
    return { ok: false, message: "We could not update your password. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/member");
}