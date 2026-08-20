import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getAdminMembershipPlans } from "@/lib/supabase/queries";
import { PlanEditForm } from "@/components/memberships/plan-edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const plans = await getAdminMembershipPlans();
  const plan = plans.find((p) => p.id === id);
  return {
    title: plan ? `Edit: ${plan.name}` : "Plan not found",
    description: "Edit a membership plan.",
  };
}

export default async function AdminMembershipEditPage({ params }: PageProps) {
  const { id } = await params;
  const plans = await getAdminMembershipPlans();
  const plan = plans.find((p) => p.id === id);

  if (!plan) notFound();

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
          Edit plan
        </h1>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <PlanEditForm plan={plan} />
      </div>
    </Container>
  );
}
