/**
 * Shared domain constants. Pure TypeScript: safe to import from both Convex
 * functions and the Next.js UI. Stored values are short slugs; labels are for display.
 */

export const CATEGORIES = [
  "power_tools",
  "hand_tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  power_tools: "Power tools",
  hand_tools: "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

export const CONDITIONS = ["like_new", "good", "worn"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  like_new: "Like new",
  good: "Good",
  worn: "Worn but works",
};

/** Stored loan states. "Overdue" is not stored: it is approved + end date in the past. */
export const LOAN_STATUSES = ["pending", "approved", "declined", "cancelled", "returned"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

/** Limits shared by server validation and UI hints (SECURITY.md rules 7 and 8). */
export const LIMITS = {
  toolNameMax: 60,
  toolDescriptionMax: 280,
  adminReasonMax: 140,
  firstNameMax: 50,
  loanMaxDays: 30,
  /** Server-side sanity bound on how far ahead a loan may start. */
  loanMaxDaysAhead: 365,
  maxActiveListingsPerUser: 20,
  maxPendingRequestsPerUser: 10,
  maxRequestsPerDay: 30,
  feedPageSize: 12,
} as const;
