import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Every route in this group is behind Clerk in proxy.ts; Convex re-checks each call.
 * Suspense: the shell reads the URL (usePathname, useParams), which on dynamic
 * routes like /loans/[id] only exists at request time (cacheComponents).
 */
export default function SignedInLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="h-16 border-b" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
