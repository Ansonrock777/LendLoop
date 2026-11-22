import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next.js 16 "proxy" (formerly middleware). Sends signed-out visitors to sign-in
 * for signed-in areas. This is a convenience layer: every Convex function checks
 * identity and role again on the server (SECURITY.md rule 1).
 * "/" stays open because it serves the public feed (name + category only).
 */
const isSignedInArea = createRouteMatcher([
  "/listings(.*)",
  "/list(.*)",
  "/requests(.*)",
  "/incoming(.*)",
  "/loans(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isSignedInArea(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
