"use client";

import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { RequestDialog } from "@/components/app/request-dialog";
import { SignedInFeed } from "@/components/app/tool-feed";
import type { Tool } from "@/lib/types";

/**
 * Signed-in home. The "available today / neighbours lending" counts from the mock
 * version are gone: with a paginated feed the page only knows the tools it has
 * loaded so far, and a count of those would be wrong (D22).
 */
export function Browse() {
  const [requesting, setRequesting] = useState<Tool | null>(null);
  return (
    <>
      <PageHeader title="On the board" description="What your neighbours can lend right now, newest first." />
      <SignedInFeed onRequest={setRequesting} />
      <RequestDialog tool={requesting} onOpenChange={(open) => !open && setRequesting(null)} />
    </>
  );
}
