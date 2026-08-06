/**
 * Derive a stable slug value from a display label.
 * e.g. "Communication Services" → "communication-services"
 *
 * Must stay in sync with the SQL equivalent in
 * drizzle/20260805183730_slow_polaris/migration.sql
 */
export const toSlug = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
