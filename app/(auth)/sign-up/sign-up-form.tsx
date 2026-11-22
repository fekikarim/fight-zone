"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { AuthField, PasswordStrength } from "@/components/auth/auth-field";
import { AlertCircle, ArrowRight, Lock, Mail, User } from "lucide-react";

const initialState: AuthActionState = { ok: false };

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", password: "" },
  });
  const password = watch("password");

  const onSubmit = (values: SignUpInput) => {
    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("password", values.password);
    if (next) formData.set("next", next);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <AuthField
        id="fullName"
        label="Full name"
        icon={User}
        enterKeyHint="next"
        autoCapitalize="words"
        placeholder="Your full name"
        autoComplete="name"
        error={errors.fullName?.message}
        valid={Boolean(dirtyFields.fullName)}
        {...register("fullName")}
      />
      <AuthField
        id="email"
        label="Email"
        icon={Mail}
        type="email"
        inputMode="email"
        enterKeyHint="next"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        valid={Boolean(dirtyFields.email)}
        {...register("email")}
      />
      <div className="flex flex-col gap-3">
        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          password
          enterKeyHint="go"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordStrength value={password ?? ""} />
      </div>

      {state.message ? (
        <p role="alert" className="flex animate-[fz-fade-up_200ms_var(--ease-out)_both] items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="h-[54px] rounded-2xl text-base shadow-[var(--shadow-hit)]">
        {isPending ? (<><Spinner size="sm" /> Creating account…</>) : (<>Create account <ArrowRight className="h-[18px] w-[18px]" aria-hidden /></>)}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        By creating an account you agree to our <Link href="/terms" className="underline-offset-2 hover:text-foreground hover:underline">Terms</Link> and <Link href="/privacy" className="underline-offset-2 hover:text-foreground hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
