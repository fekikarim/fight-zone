"use client";

import { useEffect, useActionState, useTransition, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import {
  exchangeRecoveryCode,
  updatePassword,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/auth/password-input";

interface ResetPasswordFormProps {
  code: string | undefined;
}

export function ResetPasswordForm({ code }: ResetPasswordFormProps) {
  const [verification, setVerification] = useState<AuthActionState>(() =>
    code
      ? { ok: false }
      : { ok: false, message: "This reset link is missing its code." },
  );
  const [isVerifying, startVerifying] = useTransition();
  const [passwordState, passwordAction, isUpdating] = useActionState(
    updatePassword,
    { ok: false } as AuthActionState,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (!code) return;
    const formData = new FormData();
    formData.set("code", code);
    startVerifying(async () => {
      const result = await exchangeRecoveryCode(formData);
      setVerification(result);
    });
  }, [code]);

  const onSubmit = (values: ResetPasswordInput) => {
    const formData = new FormData();
    formData.set("password", values.password);
    passwordAction(formData);
  };

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!verification.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-ink-border bg-ink-soft/60 px-6 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-primary" />
        <p className="text-sm leading-relaxed text-muted">
          {verification.message}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-xs font-medium text-primary">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {passwordState.message ? (
        <p
          role="alert"
          className="rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary"
        >
          {passwordState.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isUpdating}>
        {isUpdating ? (
          <>
            <Spinner size="sm" />
            Updating…
          </>
        ) : (
          "Set new password"
        )}
      </Button>
    </form>
  );
}
