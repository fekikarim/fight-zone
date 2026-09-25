/**
 * Pure image-content checks (no server-only dependencies — safe to import
 * from client components, server actions, and headless tests alike).
 */

/**
 * Verifies the file's magic bytes match a known image signature, so a
 * renamed script/executable cannot pass MIME-based checks.
 */
export function sniffImageMime(bytes: Uint8Array, claimed: string): boolean {
  const sig = (offset: number, ...vals: number[]) =>
    vals.every((v, i) => bytes[offset + i] === v);
  const ascii = (offset: number, text: string) =>
    [...text].every((c, i) => bytes[offset + i] === c.charCodeAt(0));

  switch (claimed) {
    case "image/png":
      return sig(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return sig(0, 0xff, 0xd8, 0xff);
    case "image/gif":
      return ascii(0, "GIF87a") || ascii(0, "GIF89a");
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    default:
      return false;
  }
}
