import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { EventCreateForm } from "@/components/events/event-create-form";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = {
  title: "Create Event",
  description: "Create a new event at Fight Zone.",
};

export default function AdminEventCreatePage() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <PageHeader
          title="Create event"
          description="Add a new event to the calendar."
          back={{ href: "/admin/events", label: "Back to events" }}
        />
        <EventCreateForm />
      </div>
    </Container>
  );
}
