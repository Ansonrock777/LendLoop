"use client";

import { useMutation } from "convex/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { copy, loanNote } from "@/lib/copy";
import { errorMessage } from "@/lib/errors";
import { daysBetween, formatDate, formatLength } from "@/lib/format";
import type { Loan, Perspective } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConfirmAction } from "./confirm-action";
import { PickupContact } from "./pickup-contact";
import { StatusBadge } from "./status-badge";

/**
 * One loan as a ledger row (rows sit inside one surface with dividers, not one card each).
 * Tool, other person, dates, status, a plain sentence, ONE primary action and a details link.
 * `quiet` rows (finished loans) drop the note and actions.
 */
export function LoanRow({ loan, perspective, quiet = false }: { loan: Loan; perspective: Perspective; quiet?: boolean }) {
  const other = perspective === "borrower" ? loan.lenderFirstName : loan.borrowerFirstName;
  const note = loanNote(loan, perspective);
  const contactOpen = (loan.status === "approved" || loan.status === "overdue") && loan.pickupEmail;

  return (
    <li className={cn("flex gap-4 px-4 py-4 sm:px-5", quiet ? "items-center" : "items-start sm:py-5")}>
      <ToolArt name={loan.tool.name} category={loan.tool.category} className={cn("rounded-md p-1.5", quiet ? "w-14" : "w-16 sm:w-24")} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
          <div className="min-w-0">
            <h3 className={cn("font-heading leading-snug font-medium", quiet ? "text-[1.0625rem]" : "text-[1.1875rem]")}>
              <Link href={`/loans/${loan._id}`} className="rounded-xs outline-none hover:underline hover:decoration-border-strong hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/35">
                {loan.tool.name}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground tabular">
              {perspective === "borrower" ? "from" : "for"} <span className="font-medium text-foreground">{other}</span> · {formatDate(loan.start)} – {formatDate(loan.end)}
              <span className="max-sm:hidden"> · {formatLength(daysBetween(loan.start, loan.end))}</span>
            </p>
          </div>
          <StatusBadge status={loan.status} />
        </div>
        {!quiet && note && <p className="max-w-[60ch]">{note}</p>}
        {!quiet && contactOpen && <PickupContact name={other} email={loan.pickupEmail!} />}
        {!quiet && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <LoanActions loan={loan} perspective={perspective} />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href={`/loans/${loan._id}`}>
                Details
                <ChevronRight aria-hidden data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function LoanActions({ loan, perspective }: { loan: Loan; perspective: Perspective }) {
  const cancel = useMutation(api.loans.cancel);
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [busy, setBusy] = useState(false);
  const loanId = loan._id;

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (perspective === "borrower" && loan.status === "pending") {
    return (
      <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => cancel({ loanId }), copy.cancelled)}>
        Cancel request
      </Button>
    );
  }

  if (perspective === "lender" && loan.status === "pending") {
    return (
      <>
        <Button size="sm" disabled={busy} onClick={() => run(() => approve({ loanId }), copy.approved(loan.borrowerFirstName))}>
          Approve
        </Button>
        <ConfirmAction
          trigger={
            <Button variant="outline" size="sm" disabled={busy}>
              Decline
            </Button>
          }
          title={`Say no to ${loan.borrowerFirstName}?`}
          description={`We'll tell ${loan.borrowerFirstName} you can't lend the ${loan.tool.name.toLowerCase()} for those dates, and suggest other dates or a similar tool. This can't be undone.`}
          confirmLabel="Decline request"
          onConfirm={() => run(() => decline({ loanId }), copy.declined(loan.borrowerFirstName))}
        />
      </>
    );
  }

  if (perspective === "lender" && (loan.status === "approved" || loan.status === "overdue")) {
    return (
      <Button size="sm" disabled={busy} onClick={() => run(() => markReturned({ loanId }), copy.returned(loan.tool.name))}>
        Mark returned
      </Button>
    );
  }

  return null;
}
