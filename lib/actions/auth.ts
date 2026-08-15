"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";
import {
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
      emailRedirectTo: `${getSiteUrl()}/sign-in`,
    },
  });

  if (error) {
    logError("Sign-up failed", error);
    return {
      ok: false,
      message: "We could not create your account. Please try again.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/member");
  }

  return {
    ok: true,
    message:
      "Account created! Check your email to confirm your address, then sign in.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
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
