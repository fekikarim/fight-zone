import { Award, Bolt, Crown, Flame, Hand, Medal, Shield, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { medal: Medal, trophy: Trophy, flame: Flame, star: Star, shield: Shield, crown: Crown, glove: Hand, bolt: Bolt } as const;
const ACCENTS: Record<string, string> = {
  rose: "from-rose-500 to-rose-800 ring-rose-400/40",
  amber: "from-amber-400 to-amber-700 ring-amber-300/40",
  emerald: "from-emerald-400 to-emerald-700 ring-emerald-300/40",
  sky: "from-sky-400 to-sky-700 ring-sky-300/40",
  violet: "from-violet-400 to-violet-700 ring-violet-300/40",
  zinc: "from-zinc-300 to-zinc-600 ring-zinc-200/40",
};

/** Badge artwork from Seif's chosen icon + colour (locked = greyscale). */
export function BadgeMedal({ icon, accent, size = "md", earned = true }: { icon: string; accent: string; size?: "sm" | "md" | "lg"; earned?: boolean }) {
  const Icon = ICONS[icon as keyof typeof ICONS] ?? Award;
  const dim = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const glyph = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2", dim,
      earned ? ACCENTS[accent] ?? ACCENTS.rose : "from-zinc-800 to-zinc-900 ring-zinc-800")} aria-hidden>
      <Icon className={cn(glyph, earned ? "text-white" : "text-zinc-600")} />
    </span>
  );
}
