import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SessionCreateForm } from "@/components/services/session-create-form";

export const metadata: Metadata = {
  title: "Create Session",
  description: "Create a new coaching session at Fight Zone.",
};

export default function AdminSessionCreatePage() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Create session
        </h1>
        <p className="text-sm text-muted">
          Add a new coaching session or program.
        </p>
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <SessionCreateForm />
      </div>
    </Container>
  );
}
