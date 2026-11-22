import { describe, expect, test } from "vitest";
import { parseSignatureHeader, signPayload, timingSafeEqual, verifySignature } from "./hmac";

// Test-only value, not a real secret.
const SECRET = "test-secret-0123456789abcdef0123456789";
const BODY = JSON.stringify({ eventId: "evt_1", type: "request_created" });
const NOW = Date.parse("2026-11-20T12:00:00Z");

describe("signed webhooks", () => {
  test("a correctly signed body verifies", async () => {
    const header = await signPayload(SECRET, BODY, NOW);
    expect(await verifySignature(SECRET, BODY, header, NOW)).toEqual({ ok: true });
  });

  test("a changed body is rejected", async () => {
    const header = await signPayload(SECRET, BODY, NOW);
    expect(await verifySignature(SECRET, BODY.replace("evt_1", "evt_2"), header, NOW)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  test("a different secret is rejected", async () => {
    const header = await signPayload(SECRET, BODY, NOW);
    expect(await verifySignature(SECRET + "x", BODY, header, NOW)).toMatchObject({ reason: "mismatch" });
  });

  test("a replay older than 5 minutes is rejected, 5 minutes is accepted", async () => {
    const header = await signPayload(SECRET, BODY, NOW);
    expect(await verifySignature(SECRET, BODY, header, NOW + 300_000)).toEqual({ ok: true });
    expect(await verifySignature(SECRET, BODY, header, NOW + 301_000)).toMatchObject({ reason: "expired" });
    expect(await verifySignature(SECRET, BODY, header, NOW - 301_000)).toMatchObject({ reason: "expired" });
  });

  test("a fresh timestamp can't be swapped onto an old signature", async () => {
    const header = await signPayload(SECRET, BODY, NOW);
    const v1 = header.split("v1=")[1];
    const forged = `t=${Math.floor(NOW / 1000) + 600},v1=${v1}`;
    expect(await verifySignature(SECRET, BODY, forged, NOW + 600_000)).toMatchObject({ reason: "mismatch" });
  });

  test("missing, malformed and misconfigured cases fail closed", async () => {
    expect(await verifySignature(SECRET, BODY, null, NOW)).toMatchObject({ reason: "missing" });
    expect(await verifySignature(SECRET, BODY, "t=abc,v1=zz", NOW)).toMatchObject({ reason: "malformed" });
    expect(await verifySignature(undefined, BODY, "t=1,v1=" + "a".repeat(64), NOW)).toMatchObject({
      reason: "misconfigured",
    });
    expect(await verifySignature("short", BODY, "t=1,v1=" + "a".repeat(64), NOW)).toMatchObject({
      reason: "misconfigured",
    });
    await expect(signPayload("short", BODY, NOW)).rejects.toThrow();
  });

  test("header parser is strict", () => {
    const v1 = "a".repeat(64);
    expect(parseSignatureHeader(`t=1700000000,v1=${v1}`)).toEqual({ t: 1700000000, v1 });
    expect(parseSignatureHeader(`t=1700000000`)).toBeNull();
    expect(parseSignatureHeader(`t=1700000000,v1=${v1},extra=1`)).toBeNull();
    expect(parseSignatureHeader(`t=1700000000,v1=${v1.toUpperCase()}`)).toBeNull();
    expect(parseSignatureHeader(`t=1,v1=${v1}=`)).toBeNull();
  });

  test("timingSafeEqual compares whole strings", () => {
    expect(timingSafeEqual("abcd", "abcd")).toBe(true);
    expect(timingSafeEqual("abcd", "abce")).toBe(false);
    expect(timingSafeEqual("abcd", "abc")).toBe(false);
  });
});
