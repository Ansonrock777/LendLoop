"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";

// Only the public deployment URL reaches the browser; no Convex keys do.
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Creates or refreshes the caller's user row once Convex has accepted their Clerk token. */
function StoreUserOnSignIn() {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  useEffect(() => {
    if (isAuthenticated) void storeUser({});
  }, [isAuthenticated, storeUser]);
  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <StoreUserOnSignIn />
      {children}
    </ConvexProviderWithClerk>
  );
}
