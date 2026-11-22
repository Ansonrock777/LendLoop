import { Ban, CircleCheck, CircleX, Clock, Hourglass, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LoanViewStatus } from "@/lib/types";

/** Text + icon, so colour is never the only signal (DESIGN.md). */
const MAP: Record<LoanViewStatus, { label: string; variant: "attention" | "success" | "secondary" | "outline"; Icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "attention", Icon: Hourglass },
  approved: { label: "Approved", variant: "success", Icon: CircleCheck },
  overdue: { label: "Overdue", variant: "attention", Icon: Clock },
  returned: { label: "Returned", variant: "outline", Icon: Undo2 },
  declined: { label: "Declined", variant: "secondary", Icon: CircleX },
  cancelled: { label: "Cancelled", variant: "secondary", Icon: Ban },
};

export function StatusBadge({ status }: { status: LoanViewStatus }) {
  const { label, variant, Icon } = MAP[status];
  return (
    <Badge variant={variant} className="h-6 px-2.5 text-xs">
      <Icon aria-hidden data-icon="inline-start" />
      {label}
    </Badge>
  );
}
