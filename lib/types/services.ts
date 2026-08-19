import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Canonical discipline constants
// ---------------------------------------------------------------------------

export const DISCIPLINES = [
  "English Boxing",
  "Kick Boxing",
  "Fitness & Strength Training",
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

export const disciplineLabel: Record<Discipline, string> = {
  "English Boxing": "English Boxing",
  "Kick Boxing": "Kick Boxing",
  "Fitness & Strength Training": "Fitness & Strength",
};

// ---------------------------------------------------------------------------
// Session type labels
// ---------------------------------------------------------------------------

export const sessionTypeLabel: Record<string, string> = {
  PERSONAL: "Personal",
  TECHNICAL: "Technical",
  PHYSICAL: "Physical",
  STRATEGY: "Strategy",
  COMBO: "Combo",
};

// ---------------------------------------------------------------------------
// Skill level labels
// ---------------------------------------------------------------------------

export const skillLevelLabel: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  PROFESSIONAL: "Professional",
};

// ---------------------------------------------------------------------------
// Domain types (derived from DB row types)
// ---------------------------------------------------------------------------

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type CoachProfileRow = Database["public"]["Tables"]["coach_profiles"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];

/** Minimal session info for cards. */
export type SessionSummary = Pick<
  SessionRow,
  "id" | "title" | "description" | "type" | "duration_min" | "price" | "is_active" | "discipline" | "level"
>;

/** Session detail with coach info. */
export type SessionDetail = SessionRow & {
  coach_profiles: (CoachProfileRow & {
    profiles: Pick<ProfileRow, "full_name" | "avatar_url"> | null;
  }) | null;
};

/** Coach profile for public directory. */
export type CoachSummary = CoachProfileRow & {
  profiles: Pick<ProfileRow, "id" | "full_name" | "avatar_url"> | null;
  session_count?: number;
};

/** Coach detail with achievements and sessions. */
export type CoachDetail = CoachProfileRow & {
  profiles: Pick<ProfileRow, "id" | "full_name" | "avatar_url" | "email"> | null;
  achievements: AchievementRow[];
  sessions: SessionRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive session lifecycle from is_active. */
export function getSessionStatus(isActive: boolean): "active" | "inactive" {
  return isActive ? "active" : "inactive";
}

/** Extract unique disciplines from a list of sessions. */
export function getUniqueDisciplines(sessions: SessionSummary[]): string[] {
  const set = new Set<string>();
  for (const s of sessions) {
    if (s.discipline) set.add(s.discipline);
  }
  return Array.from(set).sort();
}

/** Extract unique levels from a list of sessions. */
export function getUniqueLevels(sessions: SessionSummary[]): string[] {
  const set = new Set<string>();
  for (const s of sessions) {
    if (s.level) set.add(s.level);
  }
  return Array.from(set).sort();
}
