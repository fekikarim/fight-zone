"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check } from "lucide-react";
import {
  memberProfileSchema,
  type MemberProfileFormValues,
} from "@/lib/validations/member";
import { updateMemberProfile, type MemberActionState } from "@/lib/actions/member";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import type { Database } from "@/types/database.types";

type MemberProfileRow = Pick<
  Database["public"]["Tables"]["member_profiles"]["Row"],
  | "id"
  | "date_of_birth"
  | "gender"
  | "address"
  | "skill_level"
  | "weight"
  | "height"
  | "bio"
  | "is_verified"
>;

const initialState: MemberActionState = { ok: false };

const selectClass =
  "flex h-11 w-full appearance-none rounded-md border border-ink-border bg-ink-soft px-3.5 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-ring disabled:cursor-not-allowed disabled:opacity-50";

interface ProfileFormProps {
  fullName: string | null;
  phone: string | null;
  member: MemberProfileRow | null;
}

export function ProfileForm({ fullName, phone, member }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateMemberProfile, initialState);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberProfileFormValues>({
    resolver: zodResolver(memberProfileSchema),
    defaultValues: {
      fullName: fullName ?? "",
      phone: phone ?? "",
      dateOfBirth: member?.date_of_birth ?? "",
      gender: member?.gender ?? "",
      address: member?.address ?? "",
      skillLevel: member?.skill_level ?? "",
      weight: member?.weight ?? "",
      height: member?.height ?? "",
      bio: member?.bio ?? "",
    },
  });

  const onSubmit = (values: MemberProfileFormValues) => {
    const formData = new FormData();
    formData.set("fullName", String(values.fullName));
    formData.set("phone", String(values.phone ?? ""));
    formData.set("dateOfBirth", String(values.dateOfBirth ?? ""));
    formData.set("gender", String(values.gender ?? ""));
    formData.set("address", String(values.address ?? ""));
    formData.set("skillLevel", String(values.skillLevel ?? ""));
    formData.set("weight", String(values.weight ?? ""));
    formData.set("height", String(values.height ?? ""));
    formData.set("bio", String(values.bio ?? ""));
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p id="fullName-error" className="text-xs font-medium text-primary">
              {String(errors.fullName.message ?? "")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+216 …"
            {...register("phone")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          {errors.dateOfBirth ? (
            <p className="text-xs font-medium text-primary">
              {String(errors.dateOfBirth.message ?? "")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">Gender</Label>
          <select id="gender" className={selectClass} {...register("gender")}>
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            autoComplete="street-address"
            placeholder="City, street…"
            {...register("address")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="skillLevel">Skill level</Label>
          <select id="skillLevel" className={selectClass} {...register("skillLevel")}>
            <option value="">Not sure yet</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="PROFESSIONAL">Professional</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="400"
            placeholder="72.0"
            {...register("weight")}
          />
          {errors.weight ? (
            <p className="text-xs font-medium text-primary">
              {String(errors.weight.message ?? "")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="250"
            placeholder="178.0"
            {...register("height")}
          />
          {errors.height ? (
            <p className="text-xs font-medium text-primary">
              {String(errors.height.message ?? "")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="bio">About you</Label>
          <Textarea
            id="bio"
            placeholder="Goals, experience, injuries, preferences…"
            {...register("bio")}
          />
          {errors.bio ? (
            <p className="text-xs font-medium text-primary">
              {String(errors.bio.message ?? "")}
            </p>
          ) : null}
        </div>
      </div>

      {state.message ? (
        <p
          role="alert"
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-primary/30 bg-primary-soft text-primary"
          }`}
        >
          {state.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{state.message}</span>
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner size="sm" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
