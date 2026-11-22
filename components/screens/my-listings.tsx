"use client";

import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState, FactRow, PageHeader } from "@/components/app/page-header";
import { Availability } from "@/components/app/tool-card";
import { ToolArt } from "@/components/tool-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/convex/lib/domain";
import { copy } from "@/lib/copy";
import { errorMessage } from "@/lib/errors";

export function MyListings() {
  const myListings = useQuery(api.tools.mine);
  const deleteTool = useMutation(api.tools.remove);

  if (myListings === undefined) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const out = myListings.filter((t) => t.onLoanUntil).length;
  const waiting = myListings.reduce((n, t) => n + t.pendingRequests, 0);

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're happy to lend. Neighbours see the name, category, condition and your first name."
        meta={
          myListings.length > 0 && (
            <FactRow
              items={[
                { label: myListings.length === 1 ? "tool listed" : "tools listed", value: myListings.length },
                { label: "out on loan", value: out },
                { label: waiting === 1 ? "request waiting" : "requests waiting", value: waiting, tone: waiting ? "attention" : undefined },
              ]}
            />
          )
        }
        action={
          myListings.length > 0 && (
            <Button asChild variant="outline">
              <Link href="/list">
                <Plus aria-hidden data-icon="inline-start" />
                List another tool
              </Link>
            </Button>
          )
        }
      />

      {myListings.length === 0 ? (
        <EmptyState
          art={<ToolArt name="Toolbox" category="hand_tools" frame="none" />}
          message={copy.emptyListings}
          action={
            <Button asChild>
              <Link href="/list">List a tool</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {myListings.map((t) => (
            <li key={t._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <ToolArt name={t.name} category={t.category} className="w-20 rounded-md p-1.5 sm:w-24" />
                <div className="min-w-0 space-y-1.5">
                  <h2 className="font-heading text-[1.1875rem] leading-snug font-medium">{t.name}</h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="tag">{CATEGORY_LABELS[t.category]}</Badge>
                    <Badge variant="tag">{CONDITION_LABELS[t.condition]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Availability until={t.onLoanUntil} />
                    {t.pendingRequests > 0 && (
                      <Link
                        href="/incoming"
                        className="rounded-xs text-sm font-medium text-attention-foreground underline decoration-attention-line underline-offset-4 outline-none hover:decoration-attention-foreground focus-visible:ring-3 focus-visible:ring-ring/35"
                      >
                        {t.pendingRequests === 1 ? "1 request waiting" : `${t.pendingRequests} requests waiting`}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/listings/${t._id}/edit`}>
                    <Pencil aria-hidden data-icon="inline-start" />
                    Edit
                  </Link>
                </Button>
                <ConfirmAction
                  trigger={
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${t.name}`}>
                      <Trash2 aria-hidden data-icon="inline-start" />
                      Delete
                    </Button>
                  }
                  title={`Delete your ${t.name.toLowerCase()}?`}
                  description="It disappears from the board straight away. Past loans stay in your history. This can't be undone."
                  confirmLabel="Delete listing"
                  onConfirm={async () => {
                    try {
                      await deleteTool({ toolId: t._id });
                      toast.success(copy.toolDeleted(t.name));
                    } catch (e) {
                      // e.g. CONFLICT: "This tool is lent out or booked. Mark it returned before removing it."
                      toast.error(errorMessage(e));
                    }
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
