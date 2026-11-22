"use client";

import { ClerkLoading, Show } from "@clerk/nextjs";
import { AppShell } from "@/components/app/app-shell";
import { Browse } from "@/components/screens/browse";
import { PublicHome } from "@/components/screens/public-home";
import { Skeleton } from "@/components/ui/skeleton";

/** "/" is open: signed-out visitors get the public feed, signed-in people get Browse. */
export default function HomePage() {
  return (
    <>
      <ClerkLoading>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-24 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </ClerkLoading>
      <Show when="signed-out">
        <PublicHome />
      </Show>
      <Show when="signed-in">
        <AppShell>
          <Browse />
        </AppShell>
      </Show>
    </>
  );
}
