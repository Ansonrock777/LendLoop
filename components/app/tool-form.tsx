"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CATEGORY_LABELS, CONDITIONS, CONDITION_LABELS, LIMITS } from "@/convex/lib/domain";
import { copy } from "@/lib/copy";
import { errorMessage } from "@/lib/errors";
import type { Id } from "@/convex/_generated/dataModel";
import type { Category, Condition, ToolDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ToolCard } from "./tool-card";

type Errors = Partial<Record<"name" | "category" | "description", string>>;

/** UX-only checks; Convex runs cleanText/cleanToolName/cleanToolDescription again. */
function check(d: ToolDraft): Errors {
  const e: Errors = {};
  const name = d.name.trim();
  if (!name) e.name = copy.nameRequired;
  else if (name.length > LIMITS.toolNameMax) e.name = copy.nameTooLong;
  if (!d.category) e.category = copy.categoryRequired;
  if (d.description.length > LIMITS.toolDescriptionMax) e.description = copy.descriptionTooLong;
  return e;
}

/**
 * Label above, helper below, error in text tied to the field (DESIGN.md "Forms").
 * Desktop shows a live preview of the card neighbours will see, so the privacy
 * promise ("only this is shown") is visible, not just stated.
 */
export function ToolForm({
  initial,
  submitLabel,
  onSubmit,
  lenderFirstName = "you",
}: {
  initial?: ToolDraft;
  submitLabel: string;
  onSubmit: (draft: ToolDraft) => Promise<string>;
  lenderFirstName?: string;
}) {
  const router = useRouter();
  const ids = { name: useId(), category: useId(), condition: useId(), description: useId() };
  const [draft, setDraft] = useState<ToolDraft>(initial ?? { name: "", category: "", condition: "good", description: "" });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const errors = touched ? check(draft) : {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const found = check(draft);
    if (Object.keys(found).length) {
      const first = (["name", "category", "description"] as const).find((k) => found[k]);
      if (first) document.getElementById(ids[first])?.focus();
      return;
    }
    setSaving(true);
    try {
      const message = await onSubmit({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
      toast.success(message);
      router.push("/listings");
    } catch (e) {
      toast.error(errorMessage(e));
      setSaving(false);
    }
  }

  const describedBy = (field: keyof Errors, helpId: string) => (errors[field] ? `${helpId} ${field}-error` : helpId);
  const over = draft.description.length > LIMITS.toolDescriptionMax;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={submit} noValidate className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="divide-y divide-border">
          <Field label="What is it?" htmlFor={ids.name} helpId={`${ids.name}-help`} help="A short name neighbours will recognise, like “Cordless drill”." error={errors.name} errorId="name-error">
            <Input
              id={ids.name}
              value={draft.name}
              maxLength={LIMITS.toolNameMax + 20}
              autoComplete="off"
              aria-invalid={!!errors.name}
              aria-describedby={describedBy("name", `${ids.name}-help`)}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>

          <div className="grid gap-x-6 sm:grid-cols-2">
            <Field label="Category" htmlFor={ids.category} error={errors.category} errorId="category-error" className="max-sm:border-b max-sm:border-border">
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as Category })}>
                <SelectTrigger id={ids.category} className="w-full" aria-invalid={!!errors.category} aria-describedby={errors.category ? "category-error" : undefined}>
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Condition" htmlFor={ids.condition}>
              <Select value={draft.condition} onValueChange={(v) => setDraft({ ...draft, condition: v as Condition })}>
                <SelectTrigger id={ids.condition} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label={
              <>
                Anything to know? <span className="font-normal text-muted-foreground">Optional</span>
              </>
            }
            htmlFor={ids.description}
            error={errors.description}
            errorId="description-error"
            footer={
              <div className="flex justify-between gap-4 text-sm text-muted-foreground">
                <p id={`${ids.description}-help`}>What&apos;s included, and anything a borrower should know.</p>
                <p className={cn("tabular", over && "font-medium text-destructive")} aria-live="polite">
                  {draft.description.length}/{LIMITS.toolDescriptionMax}
                </p>
              </div>
            }
          >
            <Textarea
              id={ids.description}
              rows={4}
              value={draft.description}
              aria-invalid={!!errors.description}
              aria-describedby={describedBy("description", `${ids.description}-help`)}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-sunken/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Your email stays private until you approve a loan.</p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : submitLabel}
            </Button>
          </div>
        </div>
      </form>

      <aside aria-label="Preview" className="space-y-3 max-lg:hidden lg:sticky lg:top-24">
        <p className="text-2xs font-medium text-muted-foreground">How neighbours will see it</p>
        <div className="pointer-events-none [&_article]:flex-col [&_article>div:first-child]:w-full">
          <ToolCard
            tool={{
              // Preview only: never sent anywhere, so a placeholder id is fine.
              _id: "preview" as Id<"tools">,
              name: draft.name.trim() || "Name of your tool",
              category: draft.category || "other",
              condition: draft.condition,
              description: draft.description,
              lenderFirstName,
              lenderTrusted: false,
              onLoanUntil: null,
              isOwn: true,
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{copy.privacy}</p>
      </aside>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  help,
  helpId,
  error,
  errorId,
  footer,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  help?: string;
  helpId?: string;
  error?: string;
  errorId?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2 px-5 py-5", className)}>
      <Label htmlFor={htmlFor} className="text-[0.9375rem] font-medium">
        {label}
      </Label>
      {children}
      {help && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {help}
        </p>
      )}
      {footer}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
