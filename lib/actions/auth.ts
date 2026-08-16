"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  emailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { logError } from "@/lib/errors";

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
    // Shown only to someone who already entered the address; does not enable
    // email enumeration beyond what the generic failure already allows.
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        message: "Please verify your email address first. Check your inbox for the verification link.",
      };
    }
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    logError("Sign-up failed", error);
    return {
      ok: false,
      message: "We could not create your account. Please try again.",
    };
  }

  // Email confirmation enabled: no session is issued until the user verifies.
  // Transition straight to the verification gate — never a message on the form.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/member");
  }

  revalidatePath("/", "layout");
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Authoritative email-verification check for the "I've verified my email"
 * action. Verification state comes from Supabase Auth (`email_confirmed_at`),
 * never from a client-side flag. Redirects to the app when verified.
 */
export async function checkEmailVerification(): Promise<AuthActionState> {
  const user = await getCurrentUser();
  if (user?.emailConfirmedAt) {
    revalidatePath("/", "layout");
    redirect("/member");
  }

  return {
    ok: false,
    message:
      "Your email hasn't been verified yet. Please click the verification link in your inbox and try again.",
  };
}

/**
 * Resends the signup confirmation email. Returns a generic outcome — it never
 * reveals whether an address is registered, already confirmed, or rate-limited
 * (Supabase's own email frequency/rate limits are the backstop).
 */
export async function resendVerificationEmail(email: string): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, message: "Please enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    logError("Resend verification email failed", error);
    return {
      ok: false,
      message: "We could not resend the email right now. Please try again shortly.",
    };
  }

  return {
    ok: true,
    message: "Verification email sent. Check your inbox and spam folder.",
  };
}

export async function forgotPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  // The reset link must point at our own canonical origin. Never derive the
  // redirect target from request headers (open-redirect / code-harvesting).
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  if (error) {
    logError("Password reset request failed", error);
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
