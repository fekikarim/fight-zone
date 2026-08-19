import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { EventCreateForm } from "@/components/events/event-create-form";

export const metadata: Metadata = {
  title: "Create Event",
  description: "Create a new event at Fight Zone.",
};

export default function AdminEventCreatePage() {
  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Create event
        </h1>
        <p className="text-sm text-muted">
          Add a new event to the calendar.
        </p>
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <EventCreateForm />
      </div>
    </Container>
  );
}
