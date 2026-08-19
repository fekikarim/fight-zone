"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { DISCIPLINES, disciplineLabel, skillLevelLabel, sessionTypeLabel } from "@/lib/types/services";
import type { Discipline } from "@/lib/types/services";

const levels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const types = ["PERSONAL", "TECHNICAL", "PHYSICAL", "STRATEGY", "COMBO"] as const;

interface SessionFiltersProps {
  className?: string;
}

export function SessionFilters({ className }: SessionFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentDiscipline = searchParams.get("discipline") ?? "";
  const currentLevel = searchParams.get("level") ?? "";
  const currentType = searchParams.get("type") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/services?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Discipline */}
      <div className="flex flex-wrap gap-1.5">
        <FilterButton
          active={!currentDiscipline}
          onClick={() => setParam("discipline", "")}
        >
          All
        </FilterButton>
        {DISCIPLINES.map((d) => (
          <FilterButton
            key={d}
            active={currentDiscipline === d}
            onClick={() => setParam("discipline", d)}
          >
            {disciplineLabel[d as Discipline] ?? d}
          </FilterButton>
        ))}
      </div>

      <span className="h-5 w-px bg-ink-border" aria-hidden />

      {/* Level */}
      <div className="flex flex-wrap gap-1.5">
        <FilterButton
          active={!currentLevel}
          onClick={() => setParam("level", "")}
        >
          Any level
        </FilterButton>
        {levels.map((l) => (
          <FilterButton
            key={l}
            active={currentLevel === l}
            onClick={() => setParam("level", l)}
          >
            {skillLevelLabel[l]}
          </FilterButton>
        ))}
      </div>

      <span className="h-5 w-px bg-ink-border" aria-hidden />

      {/* Type */}
      <div className="flex flex-wrap gap-1.5">
        <FilterButton
          active={!currentType}
          onClick={() => setParam("type", "")}
        >
          Any type
        </FilterButton>
        {types.map((t) => (
          <FilterButton
            key={t}
            active={currentType === t}
            onClick={() => setParam("type", t)}
          >
            {sessionTypeLabel[t]}
          </FilterButton>
        ))}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-ink-border bg-ink-soft/40 text-muted hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
