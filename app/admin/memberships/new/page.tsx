import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PlanCreateForm } from "@/components/memberships/plan-create-form";

export const metadata: Metadata = {
  title: "New Membership Plan",
  description: "Create a new membership plan.",
};

export default function AdminMembershipNewPage() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div>
        <Link
          href="/admin/memberships"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to plans
        </Link>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          New Membership Plan
        </h1>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <PlanCreateForm />
      </div>
    </Container>
  );
}
