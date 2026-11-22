"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, CircleAlert, Clock, MailCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PickupContact } from "@/components/app/pickup-contact";
import { QueryBoundary } from "@/components/app/query-boundary";
import { LoanActions } from "@/components/app/request-card";
import { StatusBadge } from "@/components/app/status-badge";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS } from "@/convex/lib/domain";
import { automationLabel, copy, loanNote } from "@/lib/copy";
import { daysBetween, formatDate, formatLength, formatMoment } from "@/lib/format";
import type { AutomationEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <QueryBoundary key={id} notFound={{ message: copy.loanNotFound, href: "/requests", label: "Go to my requests" }}>
      <LoanPage loanId={id as Id<"loans">} />
    </QueryBoundary>
  );
}

/**
 * `loans.get` answers only the loan's borrower or lender, or an admin read-only
 * (requireLoanParty). Anyone else gets FORBIDDEN, which the boundary shows as "not found".
 */
function LoanPage({ loanId }: { loanId: Id<"loans"> }) {
  const loan = useQuery(api.loans.get, { loanId });

  if (loan === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const role = loan.viewerRole;
  const isAdmin = role === "admin";
  // Admins see both names and no actions, note or email (D2).
  const perspective = role === "borrower" ? "borrower" : "lender";
  const other = perspective === "borrower" ? loan.lenderFirstName : loan.borrowerFirstName;
  const note = isAdmin ? null : loanNote(loan, perspective);
  const back =
    role === "borrower"
      ? { href: "/requests", label: "My requests" }
      : role === "lender"
        ? { href: "/incoming", label: "Incoming" }
        : { href: "/admin", label: "Admin" };
  const contactOpen = !isAdmin && (loan.status === "approved" || loan.status === "overdue") && loan.pickupEmail;

  const facts = [
    ...(isAdmin
      ? [
          { label: "Lender", value: loan.lenderFirstName },
          { label: "Borrower", value: loan.borrowerFirstName },
        ]
      : [{ label: perspective === "borrower" ? "Lender" : "Borrower", value: other }]),
    { label: "Collect", value: formatDate(loan.start) },
    { label: "Return by", value: formatDate(loan.end) },
    { label: "Length", value: formatLength(daysBetween(loan.start, loan.end)) },
    { label: "Asked on", value: formatDate(loan.requestedOn) },
    ...(loan.decidedOn ? [{ label: "Answered on", value: formatDate(loan.decidedOn) }] : []),
    ...(loan.returnedOn ? [{ label: "Returned on", value: formatDate(loan.returnedOn) }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-3 text-muted-foreground hover:text-foreground">
        <Link href={back.href}>
          <ArrowLeft aria-hidden data-icon="inline-start" />
          {back.label}
        </Link>
      </Button>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-8">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <ToolArt name={loan.tool.name} category={loan.tool.category} className="w-full max-w-[220px] sm:w-44" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={loan.status} />
                <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[loan.tool.category]}</span>
              </div>
              <h1 className="font-heading text-display-sm font-medium tracking-[-0.015em] sm:text-display">{loan.tool.name}</h1>
              {note && <p className="max-w-[56ch] text-lede">{note}</p>}
              <div className="flex flex-wrap gap-2 pt-1 empty:hidden">
                {!isAdmin && <LoanActions loan={loan} perspective={perspective} />}
              </div>
            </div>
          </header>

          {contactOpen && <PickupContact name={other} email={loan.pickupEmail!} />}

          <section aria-labelledby="activity" className="space-y-4">
            <div>
              <h2 id="activity" className="font-heading text-title font-medium tracking-[-0.01em]">
                Automation activity
              </h2>
              <p className="text-sm text-muted-foreground">Emails and reminders LendLoop sent about this loan. If one fails, we retry and show it here.</p>
            </div>
            {loan.automation?.length ? (
              <ol className="relative space-y-0 border-l border-border-strong pl-6">
                {loan.automation.map((a) => (
                  <ActivityRow key={a.id} event={a} />
                ))}
              </ol>
            ) : (
              <p className="rounded-lg bg-sunken/70 px-4 py-3 text-muted-foreground">Nothing sent yet.</p>
            )}
          </section>
        </div>

        <aside aria-label="Loan details" className="h-fit rounded-xl bg-sunken/70 p-5 lg:sticky lg:top-24">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
            {facts.map((f) => (
              <div key={f.label} className="space-y-0.5 lg:flex lg:items-baseline lg:justify-between lg:gap-4 lg:space-y-0 lg:border-b lg:border-border lg:pb-3 lg:last:border-0 lg:last:pb-0">
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="font-medium tabular">{f.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: AutomationEvent }) {
  const failed = event.state === "failed";
  const queued = event.state === "queued";
  const Icon = failed ? CircleAlert : queued ? Clock : event.kind === "reminder" ? RefreshCw : MailCheck;
  return (
    <li className="relative pb-5 last:pb-0">
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 -left-[35px] flex size-[22px] items-center justify-center rounded-full border bg-background",
          failed ? "border-attention-line text-attention-foreground" : "border-border-strong text-muted-foreground",
        )}
      >
        <Icon className="size-3" />
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className={cn("font-medium", failed && "text-attention-foreground")}>{automationLabel(event.kind, event.state)}</span>
        <span className="text-sm text-muted-foreground tabular">{formatMoment(event.at)}</span>
      </div>
    </li>
  );
}
