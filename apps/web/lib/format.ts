// Display formatting for Server Components. Locale and time zone are fixed so the output does not depend
// on the server's environment; client components must not format dates at all (the browser's locale and
// zone would differ from the server's and React would report a hydration mismatch).

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  dateStyle: "medium",
});

/** A timestamptz ISO string → "3 Sept 2026, 14:05 UTC". Unparseable input is shown as-is. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${DATE_TIME.format(date)} UTC`;
}

/** A date column ("2026-09-03") → "3 Sept 2026". Also accepts a full timestamp. */
export function formatDate(value: string): string {
  // A bare date is parsed as UTC midnight so it never shifts to the previous day.
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return DATE.format(date);
}

/** 1536 → "1.5 KB"; files are at most 25 MiB so three units are enough. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
