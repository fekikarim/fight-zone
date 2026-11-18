/** Per-field validation messages shared by server actions and client forms. */
export type FieldErrors = Record<string, string | undefined>;

/** Maps Zod issues to `{ field: firstMessage }` (first issue per field wins). */
export function issuesToFieldErrors(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
