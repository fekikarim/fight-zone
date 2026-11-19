import { z } from "zod";

export const CONTACT_CATEGORIES = ["GENERAL", "EVENTS", "PAYMENT", "COACHING", "OTHER"] as const;

export const contactSchema = z.object({
  category: z.enum(CONTACT_CATEGORIES),
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(100, "Name is too long."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address."),
  subject: z
    .string()
    .trim()
    .min(3, "Subject is too short.")
    .max(150, "Subject is too long."),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(5000, "Message is too long."),
});

export type ContactInput = z.infer<typeof contactSchema>;
