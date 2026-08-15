"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import {
  submitContactMessage,
  type ContactActionState,
} from "@/lib/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const initialState: ContactActionState = { ok: false };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactMessage,
    initialState,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });

  useEffect(() => {
    if (state.ok) reset();
  }, [state.ok, reset]);

  const onSubmit = (values: ContactInput) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value);
    }
    formAction(formData);
  };

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-primary-soft px-6 py-14 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-xl font-bold uppercase">Message sent</h3>
          <p className="text-sm text-muted">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 rounded-xl border border-ink-border bg-ink-soft/50 p-6 sm:p-8"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Your name"
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-xs font-medium text-primary">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs font-medium text-primary">{errors.email.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="What is this about?"
          aria-invalid={errors.subject ? true : undefined}
          {...register("subject")}
        />
        {errors.subject ? (
          <p className="text-xs font-medium text-primary">{errors.subject.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={6}
          placeholder="Tell me about your goals, or ask anything about the programs."
          aria-invalid={errors.message ? true : undefined}
          {...register("message")}
        />
        {errors.message ? (
          <p className="text-xs font-medium text-primary">{errors.message.message}</p>
        ) : null}
      </div>

      {state.message ? (
        <p className="rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-fit">
        {isPending ? (
          <>
            <Spinner size="sm" />
            Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
