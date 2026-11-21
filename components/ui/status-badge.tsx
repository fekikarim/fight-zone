import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  attendanceStatusLabel,
  eventDisplayStateLabel,
  eventPaymentStatusLabel,
  eventStatusLabel,
  registrationStatusLabel,
  type AttendanceStatus,
  type EventDisplayState,
  type EventPaymentStatus,
  type EventStatus,
  type RegistrationStatus,
} from "@/lib/types/events";

/**
 * One meaning per status across every portal (spec §14.2):
 * pending ≠ confirmed, submitted ≠ verified, registered ≠ attended.
 * - success: settled/positive (Confirmed, Paid, Attended, Open)
 * - warning: waiting on someone (Awaiting approval, Proof under review, Payment due)
 * - info: informational (Waitlisted, Opens soon, Covered by reward)
 * - danger: negative outcome (Declined, Proof rejected, No-show, Cancelled event)
 * - neutral/outline: inactive (Cancelled by member, Draft, Archived, Free, Not recorded)
 */
const registrationTone: Record<RegistrationStatus, BadgeVariant> = {
  PENDING: "warning",
  CONFIRMED: "success",
  WAITLISTED: "info",
  REJECTED: "danger",
  CANCELLED: "outline",
};

const paymentTone: Record<EventPaymentStatus, BadgeVariant> = {
  NOT_REQUIRED: "outline",
  UNPAID: "warning",
  PROOF_SUBMITTED: "info",
  PAID: "success",
  REJECTED: "danger",
  WAIVED: "info",
};

const attendanceTone: Record<AttendanceStatus, BadgeVariant> = {
  UNMARKED: "outline",
  ATTENDED: "success",
  NO_SHOW: "danger",
};

const eventStatusTone: Record<EventStatus, BadgeVariant> = {
  DRAFT: "outline",
  PUBLISHED: "success",
  CANCELLED: "danger",
  ARCHIVED: "neutral",
};

const displayTone: Record<EventDisplayState, BadgeVariant> = {
  draft: "outline",
  cancelled: "danger",
  archived: "neutral",
  completed: "neutral",
  in_progress: "default",
  full: "warning",
  registration_not_open: "info",
  registration_closed: "neutral",
  open: "success",
};

export type StatusInput =
  | { kind: "registration"; status: RegistrationStatus }
  | { kind: "payment"; status: EventPaymentStatus }
  | { kind: "attendance"; status: AttendanceStatus }
  | { kind: "event"; status: EventStatus }
  | { kind: "display"; status: EventDisplayState };

type StatusBadgeProps = StatusInput & { className?: string };

export function statusTone(props: StatusInput): { label: string; tone: BadgeVariant } {
  switch (props.kind) {
    case "registration":
      return { label: registrationStatusLabel[props.status], tone: registrationTone[props.status] };
    case "payment":
      return { label: eventPaymentStatusLabel[props.status], tone: paymentTone[props.status] };
    case "attendance":
      return { label: attendanceStatusLabel[props.status], tone: attendanceTone[props.status] };
    case "event":
      return { label: eventStatusLabel[props.status], tone: eventStatusTone[props.status] };
    case "display":
      return { label: eventDisplayStateLabel[props.status], tone: displayTone[props.status] };
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone } = statusTone(props);
  return (
    <Badge variant={tone} dot className={props.className}>
      {label}
    </Badge>
  );
}
