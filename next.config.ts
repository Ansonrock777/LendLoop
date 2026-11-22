import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Clerk's Frontend API host is encoded in the publishable key: pk_test_<base64("host$")>. */
function clerkFrontendApi(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const encoded = key.split("_")[2];
  if (!encoded) return null;
  const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
}

/** Convex client talks HTTPS for actions and a WebSocket for live queries. */
function convexOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return [];
  const { host } = new URL(url);
  return [`https://${host}`, `wss://${host}`];
}

const clerk = clerkFrontendApi();
const convex = convexOrigins();

/**
 * Content-Security-Policy (SECURITY.md rule 11, D22). Only our own origin plus the
 * exact Clerk and Convex hosts. Scripts allow 'unsafe-inline' because this app uses
 * Partial Prerendering (cacheComponents), which the Next.js docs say can't use
 * per-request nonces. React escaping (no dangerouslySetInnerHTML) stays the main
 * XSS defence; the CSP still blocks scripts and connections to any other host.
 * Clerk needs Cloudflare's bot check (challenges.cloudflare.com) and img.clerk.com.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${clerk ?? ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com",
  "font-src 'self'",
  `connect-src 'self' ${clerk ?? ""} ${convex.join(" ")}${isDev ? " https://clerk-telemetry.com ws://localhost:*" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

/** Security headers on every response (SECURITY.md rule 11). */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
