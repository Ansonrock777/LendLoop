import type { AuthConfig } from "convex/server";

/**
 * Convex accepts only JWTs signed by this Clerk instance with audience "convex"
 * (the Clerk JWT template named "convex"). The issuer URL is set as a Convex
 * environment variable, not hard-coded.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
