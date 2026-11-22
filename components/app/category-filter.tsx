"use client";

import { CATEGORIES, CATEGORY_LABELS } from "@/convex/lib/domain";
import type { CategoryFilter as Value } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One row of filter chips, "All" first. The only pills in the app besides status. Scrolls sideways on phones. */
export function CategoryFilter({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const options: { value: Value; label: string }[] = [
    { value: "all", label: "All" },
    ...CATEGORIES.map((c) => ({ value: c as Value, label: CATEGORY_LABELS[c] })),
  ];
  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)] sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border-strong bg-card text-foreground hover:border-input hover:bg-secondary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
