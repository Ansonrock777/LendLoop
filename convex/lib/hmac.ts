/**
 * Signed webhooks (SECURITY.md rule 3), used in both directions between Convex and n8n.
 *
 * Header: `X-LendLoop-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>`
 * Signed message: `${t}.${rawBody}`. Binding the timestamp into the signature
 * means an old request can't be replayed with a fresh timestamp.
 * Uses Web Crypto only, so it runs in the Convex runtime without Node.
 */

export const SIGNATURE_HEADER = "X-LendLoop-Signature";
/** Requests older or newer than this (seconds) are rejected, which limits replay. */
export const MAX_SKEW_SECONDS = 300;
/** Refuse to sign or verify with a short secret: fail closed if misconfigured. */
export const MIN_SECRET_LENGTH = 32;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "misconfigured" | "missing" | "malformed" | "expired" | "mismatch" };

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(new Uint8Array(sig));
}

/**
 * Compares two strings in time that depends only on their length, not on
 * where they first differ, so an attacker can't guess a signature byte by byte.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function parseSignatureHeader(header: string | null | undefined): { t: number; v1: string } | null {
  if (!header || header.length > 200) return null;
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const [key, value, ...rest] = part.trim().split("=");
    if (rest.length > 0 || value === undefined) return null;
    if (key === "t" && /^\d{1,12}$/.test(value)) t = Number(value);
    else if (key === "v1" && /^[0-9a-f]{64}$/.test(value)) v1 = value;
    else return null;
  }
  return t !== null && v1 !== null ? { t, v1 } : null;
}

export async function signPayload(secret: string, rawBody: string, nowMs: number): Promise<string> {
  if (secret.length < MIN_SECRET_LENGTH) throw new Error("Webhook secret is missing or too short.");
  const t = Math.floor(nowMs / 1000);
  const v1 = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return `t=${t},v1=${v1}`;
}

export async function verifySignature(
  secret: string | undefined,
  rawBody: string,
  header: string | null | undefined,
  nowMs: number,
): Promise<VerifyResult> {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return { ok: false, reason: "misconfigured" };
  if (!header) return { ok: false, reason: "missing" };
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, reason: "malformed" };
  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - parsed.t);
  if (ageSeconds > MAX_SKEW_SECONDS) return { ok: false, reason: "expired" };
  const expected = await hmacSha256Hex(secret, `${parsed.t}.${rawBody}`);
  return timingSafeEqual(expected, parsed.v1) ? { ok: true } : { ok: false, reason: "mismatch" };
}
