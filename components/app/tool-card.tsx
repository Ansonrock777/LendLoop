import { BadgeCheck } from "lucide-react";
import { ToolArt } from "@/components/tool-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/convex/lib/domain";
import { formatDate } from "@/lib/format";
import type { PublicTool, Tool } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Signed-out card: drawing, name and category only (SECURITY.md rule 2). Light, no chrome. */
export function PublicToolCard({ tool }: { tool: PublicTool }) {
  return (
    <article className="group space-y-3">
      <ToolArt name={tool.name} category={tool.category} className="w-full transition-colors group-hover:bg-accent" />
      <div className="space-y-0.5 px-0.5">
        <h3 className="font-heading text-[1.125rem] leading-snug font-medium">{tool.name}</h3>
        <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[tool.category]}</p>
      </div>
    </article>
  );
}

/** Availability with a small status dot; the text carries the meaning, the dot is extra. */
export function Availability({ until, className }: { until: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", until ? "text-muted-foreground" : "text-success-foreground", className)}>
      <span aria-hidden className={cn("size-2 rounded-full", until ? "bg-border-strong" : "bg-success-foreground")} />
      {until ? `On loan until ${formatDate(until)}` : "Available"}
    </span>
  );
}

export function TrustedMark() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-clay">
      <BadgeCheck aria-hidden className="size-4" />
      Trusted Lender
    </span>
  );
}

/**
 * Signed-in card. Phone: drawing on top. From sm: drawing on the left, details on the right,
 * so the feed reads as a list of things rather than a wall of identical boxes.
 */
export function ToolCard({ tool, onRequest }: { tool: Tool; onRequest?: (tool: Tool) => void }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-[border-color,box-shadow] duration-200 hover:border-border-strong sm:flex-row">
      <div className="flex items-center bg-tint px-4 py-3 sm:w-44 sm:shrink-0 sm:p-5">
        <ToolArt name={tool.name} category={tool.category} frame="none" className="mx-auto w-full max-w-[150px] sm:max-w-[220px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="tag">{CATEGORY_LABELS[tool.category]}</Badge>
            <Badge variant="tag">{CONDITION_LABELS[tool.condition]}</Badge>
          </div>
          <h3 className="font-heading text-[1.25rem] leading-tight font-medium tracking-[-0.01em]">{tool.name}</h3>
        </div>
        {tool.description && <p className="line-clamp-2 text-muted-foreground">{tool.description}</p>}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            {tool.isOwn ? "Your tool" : (
              <>
                Lent by <span className="font-medium text-foreground">{tool.lenderFirstName}</span>
              </>
            )}
          </span>
          {tool.lenderTrusted && !tool.isOwn && <TrustedMark />}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <Availability until={tool.onLoanUntil} />
          {!tool.isOwn && (
            <Button size="sm" variant={tool.onLoanUntil ? "outline" : "default"} onClick={() => onRequest?.(tool)} aria-label={`Ask to borrow ${tool.name}`}>
              Ask to borrow
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
