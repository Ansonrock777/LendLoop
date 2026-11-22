/** Date helpers. All dates are ISO yyyy-mm-dd and treated as UTC days. */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const parseIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Local calendar Date (for the date picker) from an ISO day. */
export const isoToLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "2026-12-14" -> "Mon 14 Dec". Dates are never shown as numbers only (DESIGN.md). */
export const formatDate = (iso: string) => {
  const d = parseIso(iso);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** "2026-11-17" -> "Tuesday" */
export const weekdayName = (iso: string) => DAYS_LONG[parseIso(iso).getUTCDay()];

export const daysBetween = (a: string, b: string) =>
  Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);

export const formatLength = (days: number) => (days === 1 ? "1 day" : `${days} days`);

export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export const todayIso = () => toIso(new Date());

/** A moment in the reader's own time zone: "Sat 21 Nov, 09:06". */
export const formatMoment = (ms: number) => {
  const d = new Date(ms);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export interface RangeErrors {
  start?: string;
  end?: string;
}

/**
 * Plain-words date check for the borrow request (loans are 1 to 30 days).
 * A UX hint only: Convex validates the same rules again (SECURITY.md rule 7).
 */
export function validateRange(start: string, end: string, today: string): RangeErrors {
  const errors: RangeErrors = {};
  if (start && start < today) errors.start = "Pick a start date from today onwards.";
  if (start && end) {
    if (end <= start) errors.end = "The end date needs to be after the start date.";
    else if (daysBetween(start, end) > 30) errors.end = "Loans can be up to 30 days. Try a shorter range.";
  }
  return errors;
}
