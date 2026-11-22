"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthField } from "@/components/auth/auth-field";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";

const initialState: AuthActionState = { ok: false };

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: SignInInput) => {
    const formData = new FormData();
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
      <AuthField
        id="password"
        label="Password"
        icon={Lock}
        password
        enterKeyHint="go"
        placeholder="Your password"
        autoComplete="current-password"
        error={errors.password?.message}
        aside={
          <Link href="/forgot-password" className="text-xs font-semibold text-primary-readable transition-colors hover:text-primary-hover">
            Forgot password?
          </Link>
        }
        {...register("password")}
      />

      {state.message ? (
        <p role="alert" className="flex animate-[fz-fade-up_200ms_var(--ease-out)_both] items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="h-[54px] rounded-2xl text-base shadow-[var(--shadow-hit)]">
        {isPending ? (<><Spinner size="sm" /> Signing in…</>) : (<>Sign in <ArrowRight className="h-[18px] w-[18px]" aria-hidden /></>)}
      </Button>
    </form>
  );
}
