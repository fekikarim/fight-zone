"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { forgotPassword, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { AuthField } from "@/components/auth/auth-field";
import { Spinner } from "@/components/ui/spinner";

const initialState: AuthActionState = { ok: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPassword, initialState);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: ForgotPasswordInput) => {
    const formData = new FormData();
    formData.set("email", values.email);
    startTransition(() => {
      formAction(formData);
    });
  };

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-primary-soft px-6 py-12 text-center">
        <Mail className="h-10 w-10 text-primary" />
        <p className="text-sm leading-relaxed text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <AuthField
        id="email"
        label="Email"
        icon={Mail}
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      {state.message ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="h-[54px] rounded-2xl text-base shadow-[var(--shadow-hit)]" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner size="sm" />
            Sending link…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
