"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { copy } from "@/lib/copy";
import { errorCode, errorMessage } from "@/lib/errors";
import { daysBetween, formatDate, formatLength, isoToLocalDate, toIso, todayIso, validateRange } from "@/lib/format";
import type { Tool } from "@/lib/types";

/** Pick a date range (1–30 days) and send the request. Server re-checks everything. */
export function RequestDialog({ tool, onOpenChange }: { tool: Tool | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!tool} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {tool && <RequestForm key={tool._id} tool={tool} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function RequestForm({ tool, onDone }: { tool: Tool; onDone: () => void }) {
  const requestLoan = useMutation(api.loans.request);
  const [today] = useState(todayIso);
  const [range, setRange] = useState<DateRange | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const start = range?.from ? toIso(range.from) : "";
  const end = range?.to ? toIso(range.to) : "";
  const errors = validateRange(start, end, today);
  const ready = !!start && !!end && !errors.start && !errors.end;

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await requestLoan({ toolId: tool._id, startDate: start, endDate: end });
      toast.success(copy.requestSent(tool.lenderFirstName), {
        description: `${tool.name}, ${formatDate(start)} to ${formatDate(end)}.`,
      });
      onDone();
    } catch (e) {
      // Rate limits and date clashes are answers, not failures: show them in the dialog, next to the dates.
      if (errorCode(e) === "RATE_LIMITED") {
        setLimitReached(true);
        setServerError(errorMessage(e));
      }
      else if (errorCode(e) === "CONFLICT" || errorCode(e) === "INVALID") setServerError(errorMessage(e));
      else toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const message = errors.start ?? errors.end ?? serverError;

  return (
    <>
      <DialogHeader className="flex-row items-center gap-4 pr-8">
        <ToolArt name={tool.name} category={tool.category} className="w-20 rounded-md p-1.5" />
        <div className="space-y-1">
          <DialogTitle>Borrow the {tool.name.toLowerCase()}</DialogTitle>
          <p className="text-sm text-muted-foreground">from {tool.lenderFirstName}</p>
        </div>
      </DialogHeader>
      <DialogDescription>
        Pick the day you&apos;d collect it, then the day you&apos;d bring it back. {tool.lenderFirstName} gets an email and can say yes or no.
      </DialogDescription>

      <div className="flex justify-center rounded-xl bg-sunken/70 p-2">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            setRange(r);
            setServerError(null);
          }}
          defaultMonth={isoToLocalDate(today)}
          disabled={{ before: isoToLocalDate(today) }}
          // Loans are at least 1 day: without this the first click sets both ends to the same day.
          min={1}
          weekStartsOn={1}
          className="rounded-lg bg-card shadow-xs [--cell-size:--spacing(10)]"
        />
      </div>

      <div aria-live="polite" className="min-h-6 text-sm tabular">
        {limitReached ? (
          <p className="text-attention-foreground">{serverError ?? copy.requestLimit}</p>
        ) : message ? (
          <p className="text-destructive">{message}</p>
        ) : start && end ? (
          <p>
            {formatDate(start)} to {formatDate(end)} · {formatLength(daysBetween(start, end))}
          </p>
        ) : (
          <p className="text-muted-foreground">{start ? "Now pick the return day." : "Loans can be up to 30 days."}</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Not now
        </Button>
        <Button onClick={submit} disabled={!ready || submitting || limitReached}>
          {submitting ? "Sending…" : "Send request"}
        </Button>
      </DialogFooter>
    </>
  );
}
