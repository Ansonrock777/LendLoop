import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Wordmark: Newsreader, "Loop" in clay italic. Text, so it scales and reads as the name. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-[1.4rem] leading-none font-medium tracking-[-0.02em] text-foreground", className)}>
      Lend<span className="text-clay italic">Loop</span>
    </span>
  );
}

/** Serif page title with an optional one-line description and a right-side action. */
export function PageHeader({
  title,
  description,
  action,
  meta,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Small facts under the description, e.g. counts. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-2">
        <h1 className="font-heading text-display-sm font-medium tracking-[-0.015em] text-foreground sm:text-display">{title}</h1>
        {description && <p className="max-w-[58ch] text-lede text-muted-foreground">{description}</p>}
        {meta && <div className="pt-1">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** Section heading inside a page: smaller serif title, count, optional hint. */
export function SectionHeading({ title, count, hint, id }: { title: string; count?: number; hint?: string; id?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="font-heading text-title font-medium tracking-[-0.01em]">
        {title}
        {count !== undefined && <span className="ml-2 font-sans text-body font-normal text-muted-foreground tabular">{count}</span>}
      </h2>
      {hint && <p className="hidden text-sm text-muted-foreground sm:block">{hint}</p>}
    </div>
  );
}

/** One sentence plus one action (DESIGN.md "Empty states"), on sunken paper rather than a dashed box. */
export function EmptyState({ art, message, action, className }: { art?: ReactNode; message: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-xl bg-sunken/70 px-6 py-10 text-center", className)}>
      {art && <div className="w-28 opacity-90">{art}</div>}
      <p className="max-w-sm text-body text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

/** Small "label: value" facts in a row, tabular figures. */
export function FactRow({ items }: { items: { label: string; value: ReactNode; tone?: "attention" | "success" }[] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {items.map((i) => (
        <div key={i.label} className="flex items-baseline gap-1.5">
          <dd
            className={cn(
              "font-heading text-title font-medium tabular",
              i.tone === "attention" && "text-attention-foreground",
              i.tone === "success" && "text-success-foreground",
            )}
          >
            {i.value}
          </dd>
          <dt className="text-muted-foreground">{i.label}</dt>
        </div>
      ))}
    </dl>
  );
}
