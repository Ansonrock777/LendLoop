import { describe, expect, test } from "vitest";
import { ConvexError } from "convex/values";
import {
  addDaysIso,
  cleanAdminReason,
  cleanFirstName,
  cleanToolDescription,
  cleanToolName,
  isIsoDate,
  rangesOverlap,
  validateLoanDates,
} from "./validate";

const NOW = Date.parse("2026-11-20T12:00:00Z");

function errorOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof ConvexError) return e.data as { code: string; field?: string; message: string };
    throw e;
  }
  throw new Error("expected an error");
}

describe("text cleaning", () => {
  test("trims and collapses whitespace in names", () => {
    expect(cleanToolName("  Cordless   drill \n")).toBe("Cordless drill");
  });

  test("strips control characters and bidi overrides", () => {
    expect(cleanToolName("Dri\u0000ll‮")).toBe("Drill");
  });

  test("requires a name", () => {
    expect(errorOf(() => cleanToolName("   "))).toMatchObject({ code: "INVALID", field: "name" });
  });

  test("accepts 60 characters and rejects 61", () => {
    expect(cleanToolName("a".repeat(60))).toHaveLength(60);
    expect(errorOf(() => cleanToolName("a".repeat(61)))).toMatchObject({ code: "INVALID", field: "name" });
  });

  test("description keeps single line breaks, caps blank lines, limits to 280", () => {
    expect(cleanToolDescription("Line one\r\n\n\n\nLine two")).toBe("Line one\n\nLine two");
    expect(cleanToolDescription("")).toBe("");
    expect(errorOf(() => cleanToolDescription("x".repeat(281)))).toMatchObject({ field: "description" });
  });

  test("admin reason is required and capped at 140", () => {
    expect(errorOf(() => cleanAdminReason(""))).toMatchObject({ field: "reason" });
    expect(errorOf(() => cleanAdminReason("r".repeat(141)))).toMatchObject({ field: "reason" });
  });

  test("first name falls back to Neighbour and is capped", () => {
    expect(cleanFirstName(undefined)).toBe("Neighbour");
    expect(cleanFirstName(" ‮ ")).toBe("Neighbour");
    expect(cleanFirstName("A".repeat(80))).toHaveLength(50);
  });
});

describe("dates", () => {
  test("isIsoDate rejects impossible and badly formatted dates", () => {
    expect(isIsoDate("2026-11-20")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1-5")).toBe(false);
    expect(isIsoDate("20/11/2026")).toBe(false);
  });

  test("accepts today and up to 30 days", () => {
    expect(() => validateLoanDates("2026-11-20", "2026-11-21", NOW)).not.toThrow();
    expect(() => validateLoanDates("2026-11-20", addDaysIso("2026-11-20", 30), NOW)).not.toThrow();
  });

  test("allows one day of timezone slack but not more", () => {
    expect(() => validateLoanDates("2026-11-19", "2026-11-22", NOW)).not.toThrow();
    expect(errorOf(() => validateLoanDates("2026-11-18", "2026-11-22", NOW))).toMatchObject({ field: "start" });
  });

  test("rejects end on or before start", () => {
    expect(errorOf(() => validateLoanDates("2026-11-22", "2026-11-22", NOW))).toMatchObject({ field: "end" });
    expect(errorOf(() => validateLoanDates("2026-11-22", "2026-11-21", NOW))).toMatchObject({ field: "end" });
  });

  test("rejects loans longer than 30 days", () => {
    expect(errorOf(() => validateLoanDates("2026-11-20", addDaysIso("2026-11-20", 31), NOW))).toMatchObject({
      field: "end",
    });
  });

  test("rejects starts more than a year ahead and malformed input", () => {
    expect(errorOf(() => validateLoanDates("2028-01-01", "2028-01-02", NOW))).toMatchObject({ field: "start" });
    expect(errorOf(() => validateLoanDates("tomorrow", "2026-11-22", NOW))).toMatchObject({ field: "start" });
  });

  test("overlap is inclusive of the handover day", () => {
    expect(rangesOverlap("2026-11-20", "2026-11-25", "2026-11-25", "2026-11-28")).toBe(true);
    expect(rangesOverlap("2026-11-20", "2026-11-24", "2026-11-25", "2026-11-28")).toBe(false);
  });
});
