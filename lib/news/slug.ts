/** "Été 2026: Sparring!" → "ete-2026-sparring" (ASCII, hyphenated, ≤ 80 chars). */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Public, non-guessable article slug: readable title + random suffix.
 * Never derived from database ids, so URLs reveal nothing internal and
 * can't be enumerated.
 */
export function generateArticleSlug(title: string): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${slugify(title) || "article"}-${suffix}`;
}
