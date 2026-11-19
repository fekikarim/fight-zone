/** Avatar column holds either a legacy absolute URL or a public-bucket path. */
export function avatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/fightzone-public/${value}` : null;
}
