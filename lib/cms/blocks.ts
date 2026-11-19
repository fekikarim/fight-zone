import { z } from "zod";

/**
 * About-page (CMS) block schema — versioned structured JSON, validated on
 * write (server action) AND on render. Unknown or invalid blocks are skipped
 * so one bad block can never take the whole page down. No HTML, no CSS, no
 * scripts: text is rendered by a tiny safe formatter (lib/cms/rich-text.tsx).
 */

export const CMS_SCHEMA_VERSION = 1;

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => z.string().trim().max(max).optional().default("");
const httpsUrl = z.string().trim().url().refine((u) => u.startsWith("https://"), "Must start with https://");
const linkHref = z.string().trim().max(300).refine((h) => /^\/[^/\\]/.test(h) || h === "/" || h.startsWith("https://") || h.startsWith("mailto:") || h.startsWith("tel:"), "Use a site path (/events) or an https:// link");
const image = z.object({ url: httpsUrl.or(z.literal("")), alt: optText(200) });

const VIDEO_PATTERNS = [
  /^https:\/\/(www\.)?youtube\.com\/watch\?v=([\w-]{6,20})/,
  /^https:\/\/youtu\.be\/([\w-]{6,20})/,
  /^https:\/\/(www\.)?vimeo\.com\/(\d{4,12})/,
];
/** Allowlisted video → privacy-friendly embed URL (null if not allowed). */
export function toEmbedUrl(url: string): string | null {
  const yt = url.match(VIDEO_PATTERNS[0]) ?? url.match(VIDEO_PATTERNS[1]);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[yt.length - 1]}`;
  const vm = url.match(VIDEO_PATTERNS[2]);
  if (vm) return `https://player.vimeo.com/video/${vm[2]}`;
  return null;
}

const base = { id: z.string().min(1).max(40), background: z.enum(["default", "muted", "accent"]).default("default") };

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("hero"), eyebrow: optText(60), title: text(120).min(1, "Title is required"), subtitle: optText(300), image: image.optional() }),
  z.object({ ...base, type: z.literal("richText"), heading: optText(120), text: text(8000).min(1, "Text is required") }),
  z.object({ ...base, type: z.literal("image"), image: image.extend({ url: httpsUrl }), caption: optText(200), align: z.enum(["full", "left", "right", "center"]).default("center") }),
  z.object({ ...base, type: z.literal("gallery"), heading: optText(120), images: z.array(image.extend({ url: httpsUrl })).min(1, "Add at least one image").max(24) }),
  z.object({ ...base, type: z.literal("video"), heading: optText(120), url: httpsUrl.refine((u) => toEmbedUrl(u) !== null, "Only YouTube or Vimeo links"), caption: optText(200) }),
  z.object({ ...base, type: z.literal("stats"), heading: optText(120), items: z.array(z.object({ value: text(20).min(1), label: text(60).min(1) })).min(1).max(6), verified: z.literal(true, { error: "Confirm these figures are accurate" }) }),
  z.object({ ...base, type: z.literal("timeline"), heading: optText(120), items: z.array(z.object({ when: text(30).min(1), title: text(120).min(1), text: optText(500) })).min(1).max(30) }),
  z.object({ ...base, type: z.literal("values"), heading: optText(120), items: z.array(z.object({ title: text(60).min(1), text: optText(300) })).min(1).max(9) }),
  z.object({ ...base, type: z.literal("achievements"), heading: optText(120), source: z.enum(["records"]).default("records"), limit: z.number().int().min(1).max(24).default(6) }),
  z.object({ ...base, type: z.literal("quote"), text: text(600).min(1, "Quote is required"), author: optText(80), consent: z.literal(true, { error: "Confirm the person agreed to publication" }) }),
  z.object({ ...base, type: z.literal("cta"), title: text(120).min(1, "Title is required"), text: optText(300), label: text(40).min(1, "Button label is required"), href: linkHref }),
  z.object({ ...base, type: z.literal("divider"), size: z.enum(["sm", "md", "lg"]).default("md"), line: z.boolean().default(true) }),
]);

export type CmsBlock = z.infer<typeof blockSchema>;
export type CmsBlockType = CmsBlock["type"];

export const pageContentSchema = z.object({
  version: z.literal(CMS_SCHEMA_VERSION),
  blocks: z.array(blockSchema).max(60, "At most 60 blocks"),
});
export type PageContent = z.infer<typeof pageContentSchema>;

/** Lenient parse for rendering: keeps valid blocks, drops the rest. */
export function parsePageContentSafe(raw: unknown): { blocks: CmsBlock[]; dropped: number } {
  const obj = raw && typeof raw === "object" ? (raw as { blocks?: unknown }) : {};
  const list = Array.isArray(obj.blocks) ? obj.blocks : [];
  const blocks: CmsBlock[] = [];
  for (const b of list.slice(0, 60)) {
    const r = blockSchema.safeParse(b);
    if (r.success) blocks.push(r.data);
  }
  return { blocks, dropped: list.length - blocks.length };
}

export const BLOCK_LABELS: Record<CmsBlockType, string> = {
  hero: "Hero / title",
  richText: "Text",
  image: "Image",
  gallery: "Gallery",
  video: "Video (YouTube/Vimeo)",
  stats: "Verified statistics",
  timeline: "Timeline / milestones",
  values: "Values / principles",
  achievements: "Achievements (from your records)",
  quote: "Quote / testimonial",
  cta: "Call to action",
  divider: "Divider / spacing",
};

export function newBlock(type: CmsBlockType): Record<string, unknown> {
  const id = Math.random().toString(36).slice(2, 10);
  const b = { id, type, background: "default" };
  switch (type) {
    case "hero": return { ...b, eyebrow: "About", title: "", subtitle: "" };
    case "richText": return { ...b, heading: "", text: "" };
    case "image": return { ...b, image: { url: "", alt: "" }, caption: "", align: "center" };
    case "gallery": return { ...b, heading: "", images: [] };
    case "video": return { ...b, heading: "", url: "", caption: "" };
    case "stats": return { ...b, heading: "", items: [{ value: "", label: "" }], verified: false };
    case "timeline": return { ...b, heading: "", items: [{ when: "", title: "", text: "" }] };
    case "values": return { ...b, heading: "", items: [{ title: "", text: "" }] };
    case "achievements": return { ...b, heading: "Palmares", source: "records", limit: 6 };
    case "quote": return { ...b, text: "", author: "", consent: false };
    case "cta": return { ...b, title: "", text: "", label: "See upcoming events", href: "/events" };
    case "divider": return { ...b, size: "md", line: true };
  }
}
