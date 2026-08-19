import { z } from "zod/v4";
import { DISCIPLINES, type Discipline } from "@/lib/types/services";

// ---------------------------------------------------------------------------
// Session filters (public + member)
// ---------------------------------------------------------------------------

export const sessionFilterSchema = z.object({
  discipline: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).optional(),
  type: z.enum(["PERSONAL", "TECHNICAL", "PHYSICAL", "STRATEGY", "COMBO"]).optional(),
});

export type SessionFilterValues = z.infer<typeof sessionFilterSchema>;

// ---------------------------------------------------------------------------
// Admin session create
// ---------------------------------------------------------------------------

export const createSessionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(["PERSONAL", "TECHNICAL", "PHYSICAL", "STRATEGY", "COMBO"]),
  discipline: z.enum(DISCIPLINES as unknown as [Discipline, ...Discipline[]]).optional().nullable(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).optional().nullable(),
  duration_min: z.coerce.number().int().min(1, "Duration must be at least 1 minute").max(480),
  price: z.coerce.number().min(0, "Price cannot be negative").max(99999.99),
  is_active: z.coerce.boolean().default(true),
});

export type CreateSessionValues = z.infer<typeof createSessionSchema>;

// ---------------------------------------------------------------------------
// Admin session update
// ---------------------------------------------------------------------------

export const updateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(["PERSONAL", "TECHNICAL", "PHYSICAL", "STRATEGY", "COMBO"]).optional(),
  discipline: z.enum(DISCIPLINES as unknown as [Discipline, ...Discipline[]]).optional().nullable(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]).optional().nullable(),
  duration_min: z.coerce.number().int().min(1).max(480).optional(),
  price: z.coerce.number().min(0).max(99999.99).optional(),
  is_active: z.coerce.boolean().optional(),
});

export type UpdateSessionValues = z.infer<typeof updateSessionSchema>;

// ---------------------------------------------------------------------------
// Admin session toggle (activate/deactivate)
// ---------------------------------------------------------------------------

export const toggleSessionActiveSchema = z.object({
  sessionId: z.string().uuid(),
  is_active: z.coerce.boolean(),
});

// ---------------------------------------------------------------------------
// Coach filter (admin)
// ---------------------------------------------------------------------------

export const adminSessionFilterSchema = z.object({
  status: z.enum(["active", "inactive", "all"]).optional(),
  discipline: z.string().optional(),
  type: z.enum(["PERSONAL", "TECHNICAL", "PHYSICAL", "STRATEGY", "COMBO"]).optional(),
});
