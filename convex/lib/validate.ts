/**
 * Server-side validation (SECURITY.md rule 7). Convex `v.*` validators check
 * types and enums at the function boundary; these helpers add lengths, text
 * cleaning and date rules. Every write goes through them, whatever the UI did.
 */
import { LIMITS } from "./domain";
import { appError } from "./errors";

// Control characters (except newline and tab) and Unicode bidi overrides,
// which can make text display differently from what is stored.
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const BIDI_CHARS = /[‪-‮⁦-⁩]/g;

type TextRule = { field: string; max: number; required?: boolean; multiline?: boolean };

/** Strips unsafe characters, trims, checks length. Returns the cleaned value. */
export function cleanText(raw: string, rule: TextRule): string {
  let s = raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").replace(BIDI_CHARS, "");
  s = rule.multiline ? s.replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  s = s.trim();
  if (rule.required && s.length === 0) {
    throw appError("INVALID", `Please add a ${rule.field}.`, rule.field);
  }
  if (s.length > rule.max) {
    throw appError("INVALID", `The ${rule.field} can be up to ${rule.max} characters.`, rule.field);
  }
  return s;
}

export const cleanToolName = (raw: string) =>
  cleanText(raw, { field: "name", max: LIMITS.toolNameMax, required: true });

export const cleanToolDescription = (raw: string) =>
  cleanText(raw, { field: "description", max: LIMITS.toolDescriptionMax, multiline: true });

export const cleanAdminReason = (raw: string) =>
  cleanText(raw, { field: "reason", max: LIMITS.adminReasonMax, required: true });

/** First names come from Clerk; still cleaned and capped, with a neutral fallback. */
export function cleanFirstName(raw: string | undefined | null): string {
  const s = (raw ?? "").replace(CONTROL_CHARS, "").replace(BIDI_CHARS, "").replace(/\s+/g, " ").trim();
  return s.length === 0 ? "Neighbour" : s.slice(0, LIMITS.firstNameMax);
}

/* ---------- Dates (ISO yyyy-mm-dd, compared as UTC calendar days) ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayIso(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Loan date rules: start from today, end after start, at most 30 days long.
 * The server's "today" is UTC, so one day of slack lets someone whose local date
 * is still yesterday in UTC terms pick their own "today".
 */
export function validateLoanDates(start: string, end: string, nowMs: number): void {
  if (!isIsoDate(start)) throw appError("INVALID", "Choose a start date.", "start");
  if (!isIsoDate(end)) throw appError("INVALID", "Choose an end date.", "end");
  const today = todayIso(nowMs);
  if (start < addDaysIso(today, -1)) {
    throw appError("INVALID", "Pick a start date from today onwards.", "start");
  }
  if (start > addDaysIso(today, LIMITS.loanMaxDaysAhead)) {
    throw appError("INVALID", "Pick a start date within the next year.", "start");
  }
  if (end <= start) {
    throw appError("INVALID", "The end date needs to be after the start date.", "end");
  }
  if (daysBetween(start, end) > LIMITS.loanMaxDays) {
    throw appError("INVALID", "Loans can be up to 30 days. Try a shorter range.", "end");
  }
}

/** Inclusive overlap: sharing a handover day counts as overlapping. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
