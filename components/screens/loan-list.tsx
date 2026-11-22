"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { EmptyState, FactRow, PageHeader, SectionHeading } from "@/components/app/page-header";
import { LoanRow } from "@/components/app/request-card";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { copy } from "@/lib/copy";
import type { Loan, Perspective } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "My requests" (borrower) and "Incoming" (lender). Instead of tabs that hide work,
 * loans are grouped by what they need: the group that needs action comes first and
 * gets the warm band; finished loans are compact rows at the bottom.
 */
export function LoanList({ perspective }: { perspective: Perspective }) {
  const borrower = perspective === "borrower";
  // Both hooks always run (rules of hooks); "skip" stops the one this page doesn't need.
  const mine = useQuery(api.loans.myRequests, borrower ? {} : "skip");
  const theirs = useQuery(api.loans.incoming, borrower ? "skip" : {});
  const loans = borrower ? mine : theirs;

  if (loans === undefined) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const pending = loans.filter((l) => l.status === "pending");
  const active = loans.filter((l) => l.status === "approved" || l.status === "overdue");
  const finished = loans.filter((l) => !["pending", "approved", "overdue"].includes(l.status));
  const overdue = active.filter((l) => l.status === "overdue").length;

  const header = (
    <PageHeader
      title={borrower ? "My requests" : "Incoming"}
      description={borrower ? "Things you've asked to borrow, and where each one stands." : "Neighbours asking to borrow your tools."}
      meta={
        loans.length > 0 && (
          <FactRow
            items={[
              { label: borrower ? "waiting for an answer" : "waiting for you", value: pending.length, tone: pending.length ? "attention" : undefined },
              { label: borrower ? "borrowing now" : "out on loan", value: active.length, tone: active.length ? "success" : undefined },
              ...(overdue ? [{ label: "overdue", value: overdue, tone: "attention" as const }] : []),
            ]}
          />
        )
      }
    />
  );

  if (loans.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          art={<ToolArt name="" category="other" frame="none" />}
          message={borrower ? copy.emptyRequests : copy.emptyIncoming}
          action={
            borrower && (
              <Button asChild>
                <Link href="/">Browse tools</Link>
              </Button>
            )
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-10">
        <Group
          id="pending"
          title={borrower ? "Waiting for an answer" : "Needs your answer"}
          loans={pending}
          perspective={perspective}
          highlight={!borrower}
          empty={borrower ? "Nothing waiting. Ask for something on Browse." : "No requests waiting. We'll email you when someone asks."}
        />
        <Group
          id="active"
          title={borrower ? "Borrowing now" : "Out on loan"}
          loans={active}
          perspective={perspective}
          empty={borrower ? "You're not borrowing anything right now." : "None of your tools are out right now."}
        />
        {finished.length > 0 && <Group id="finished" title="Finished" loans={finished} perspective={perspective} quiet />}
      </div>
    </>
  );
}

function Group({
  id,
  title,
  loans,
  perspective,
  highlight = false,
  quiet = false,
  empty,
}: {
  id: string;
  title: string;
  loans: Loan[];
  perspective: Perspective;
  highlight?: boolean;
  quiet?: boolean;
  empty?: string;
}) {
  return (
    <section aria-labelledby={`${id}-h`}>
      <SectionHeading id={`${id}-h`} title={title} count={loans.length} />
      {loans.length === 0 ? (
        <p className="rounded-lg bg-sunken/70 px-4 py-3 text-muted-foreground">{empty}</p>
      ) : (
        <ul
          className={cn(
            "divide-y divide-border overflow-hidden rounded-xl border",
            highlight ? "border-attention-line bg-card shadow-card" :"border-border bg-card shadow-card",
            quiet && "bg-transparent shadow-none",
          )}
        >
          {loans.map((l) => (
            <LoanRow key={l._id} loan={l} perspective={perspective} quiet={quiet} />
          ))}
        </ul>
      )}
    </section>
  );
}
