import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ScheduleList } from "@/components/events/schedule-list";
import { getMemberSchedule } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Your upcoming bookings and events at Fight Zone.",
};

export default async function MemberSchedulePage() {
  const items = await getMemberSchedule();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Schedule
        </h1>
        <p className="text-sm text-muted">
          All your upcoming bookings and registered events in one place.
        </p>
      </div>

      <ScheduleList items={items} basePath="/member" />
    </Container>
  );
}
