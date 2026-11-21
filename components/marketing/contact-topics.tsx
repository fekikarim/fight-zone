"use client";

import { CalendarDays, Dumbbell, HelpCircle, Wallet } from "lucide-react";
import { setNativeValue } from "@/components/ui/floating-panel";

const TOPICS = [
  { value: "EVENTS", label: "Events & registration", icon: CalendarDays },
  { value: "COACHING", label: "Coaching & level", icon: Dumbbell },
  { value: "PAYMENT", label: "Payment", icon: Wallet },
  { value: "GENERAL", label: "Something else", icon: HelpCircle },
] as const;

/** Topic shortcuts: pick the form's topic, then jump to the subject field. */
export function ContactTopics() {
  const choose = (value: string) => {
    const select = document.querySelector<HTMLSelectElement>('select[name="category"]');
    if (select) setNativeValue(select, value);
    const subject = document.getElementById("subject");
    subject?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => subject?.focus({ preventScroll: true }), 350);
  };

  return (
    <ul className="grid grid-cols-2 gap-2" aria-label="Choose a topic">
      {TOPICS.map(({ value, label, icon: Icon }) => (
        <li key={value} className="min-w-0">
          <button
            type="button"
            onClick={() => choose(value)}
            className="group flex h-full min-h-12 w-full items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-ink/60 px-3 py-2.5 text-left text-sm font-medium transition-[border-color,background-color,transform] duration-200 hover:border-primary/50 hover:bg-primary/[0.06] active:scale-[0.98]"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary-readable transition-transform group-hover:scale-110" aria-hidden />
            <span className="min-w-0 leading-snug">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
