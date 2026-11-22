/** All user-facing sentences in one place (tone rules: DESIGN.md "Microcopy tone"). */
import type { AuditEntry, AutomationEvent, FailedAutomation, Loan, Perspective } from "./types";
import { formatDate, lowerFirst, weekdayName } from "./format";

export const copy = {
  tagline: "Borrow what you need. Lend what you don't.",
  privacy: "We only show what a tool is. Who owns it stays private until you both agree to a loan.",
  endOfFeed: "That's everything nearby for now. Check back later, or list something of your own.",
  requestLimit: "You've got 10 requests waiting already. Once some are answered, you can send more.",
  saveError: "That didn't save. Check your connection and try again. Nothing was lost.",
  nameRequired: "Give your tool a name, like 'Cordless drill'.",
  nameTooLong: "Names can be up to 60 characters. Try a shorter one.",
  categoryRequired: "Pick the category that fits best.",
  descriptionTooLong: "Descriptions can be up to 280 characters. Try a shorter one.",
  reasonRequired: "Add a short reason. It goes in the audit log.",
  requestSent: (lender: string) => `Request sent to ${lender}.`,
  toolListed: (name: string) => `Your ${lowerFirst(name)} is listed.`,
  toolUpdated: (name: string) => `Saved changes to your ${lowerFirst(name)}.`,
  toolDeleted: (name: string) => `Your ${lowerFirst(name)} is no longer listed.`,
  approved: (borrower: string) => `You said yes to ${borrower}. Their email is now on the loan page.`,
  declined: (borrower: string) => `We'll let ${borrower} know, kindly.`,
  returned: (name: string) => `Marked your ${lowerFirst(name)} as back home.`,
  cancelled: "Request cancelled.",
  emptyListings: "You haven't listed anything yet.",
  emptyRequests: "You haven't asked to borrow anything yet.",
  emptyIncoming: "No requests waiting. We'll email you when someone asks.",
  emptyFilter: (category: string) => `Nothing in ${category} right now.`,
  loadError: "We couldn't load this just now. Check your connection and try again.",
  signInAgain: "Your sign-in has run out. Sign in again and try once more.",
  loanNotFound: "We couldn't find that loan, or it isn't one of yours.",
  listingNotFound: "We couldn't find that listing. It may have been deleted.",
};

/** Activity line on the loan page, built from what happened and how it went. */
export function automationLabel(kind: AutomationEvent["kind"], state: AutomationEvent["state"]): string {
  if (kind === "reminder" || kind === "reminder-failed") {
    return state === "failed" ? "Reminder failed" : "Reminder sent";
  }
  const what = kind === "request-email" ? "Request email" : "Answer email";
  if (state === "queued") return `${what} on its way`;
  return state === "failed" ? `${what} failed` : `${what} sent`;
}

/** Admin "Failed automations": plain names for the stored event types. */
export const FAILED_TYPE_LABELS: Record<FailedAutomation["type"], string> = {
  request_created: "Request email",
  request_approved: "Approval email",
  request_declined: "Decline email",
  reminder: "Overdue reminder",
  workflow: "Workflow run",
};

/** Admin audit log: what each action means, in words. */
export const AUDIT_ACTION_LABELS: Record<AuditEntry["action"], string> = {
  approve: "Approved a request",
  decline: "Declined a request",
  mark_returned: "Marked a tool returned",
  delete_listing: "Deleted their listing",
  remove_listing: "Removed a listing",
  set_trusted: "Gave the Trusted Lender badge",
  unset_trusted: "Removed the Trusted Lender badge",
};

/** One plain sentence under a request, chosen by status and who is reading. */
export function loanNote(loan: Loan, who: Perspective): string | null {
  const tool = lowerFirst(loan.tool.name);
  const { lenderFirstName: lender, borrowerFirstName: borrower } = loan;
  if (who === "borrower") {
    switch (loan.status) {
      case "declined":
        return `${lender} can't lend this for those dates. You could try other dates or a similar tool.`;
      case "approved":
        return `Good news: ${lender} has said yes. You can now see their email to arrange pickup.`;
      case "overdue":
        return `Friendly reminder: the ${tool} was due back ${weekdayName(loan.end)}. If you need more time, let ${lender} know.`;
      case "returned":
        return loan.returnedOn ? `Returned ${formatDate(loan.returnedOn)}. Thanks for taking care of it.` : null;
      case "cancelled":
        return "You cancelled this request.";
      default:
        return `Waiting for ${lender} to answer.`;
    }
  }
  switch (loan.status) {
    case "declined":
      return "You said no to this request.";
    case "approved":
      return `You said yes to ${borrower}. Their email is below to arrange pickup.`;
    case "overdue":
      return `${borrower} has had your ${tool} past ${weekdayName(loan.end)}. A quick message may help.`;
    case "returned":
      return loan.returnedOn ? `Returned ${formatDate(loan.returnedOn)}.` : null;
    case "cancelled":
      return `${borrower} cancelled this request.`;
    default:
      return null;
  }
}
