"use client";

import { usePaginatedQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS, LIMITS } from "@/convex/lib/domain";
import { copy } from "@/lib/copy";
import type { CategoryFilter as Filter, PublicTool, Tool } from "@/lib/types";
import { CategoryFilter } from "./category-filter";
import { EmptyState } from "./page-header";
import { PublicToolCard, ToolCard } from "./tool-card";

type PageStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";

/**
 * Newest-first feed, 12 at a time with "Show more" and an end message.
 * No infinite scroll (DESIGN.md). The category filter runs on the server
 * (by_category_status index), so "Show more" always means more of that category.
 */
export function PublicFeed() {
  const [category, setCategory] = useState<Filter>("all");
  const feed = usePaginatedQuery(
    api.tools.publicList,
    category === "all" ? {} : { category },
    { initialNumItems: LIMITS.feedPageSize },
  );
  return (
    <FeedFrame category={category} setCategory={setCategory} status={feed.status} count={feed.results.length} loadMore={() => feed.loadMore(LIMITS.feedPageSize)}>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {feed.results.map((t: PublicTool) => (
          <li key={t._id}>
            <PublicToolCard tool={t} />
          </li>
        ))}
      </ul>
    </FeedFrame>
  );
}

export function SignedInFeed({ onRequest }: { onRequest: (tool: Tool) => void }) {
  const [category, setCategory] = useState<Filter>("all");
  const feed = usePaginatedQuery(
    api.tools.listAvailable,
    category === "all" ? {} : { category },
    { initialNumItems: LIMITS.feedPageSize },
  );
  return (
    <FeedFrame category={category} setCategory={setCategory} status={feed.status} count={feed.results.length} loadMore={() => feed.loadMore(LIMITS.feedPageSize)} wide>
      <ul className="grid gap-4 lg:grid-cols-2">
        {feed.results.map((t) => (
          <li key={t._id}>
            <ToolCard tool={t} onRequest={onRequest} />
          </li>
        ))}
      </ul>
    </FeedFrame>
  );
}

function FeedFrame({
  category,
  setCategory,
  status,
  count,
  loadMore,
  wide = false,
  children,
}: {
  category: Filter;
  setCategory: (c: Filter) => void;
  status: PageStatus;
  count: number;
  loadMore: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label="Tools" className="space-y-6">
      <CategoryFilter value={category} onChange={setCategory} />

      {status === "LoadingFirstPage" ? (
        <div aria-busy="true" aria-label="Loading tools" className={wide ? "grid gap-4 lg:grid-cols-2" : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"}>
          {Array.from({ length: wide ? 4 : 8 }, (_, i) => (
            <Skeleton key={i} className={wide ? "h-44 rounded-xl" : "aspect-square rounded-xl"} />
          ))}
        </div>
      ) : count === 0 ? (
        <EmptyState
          art={<ToolArt name="" category={category === "all" ? "other" : category} />}
          message={copy.emptyFilter(category === "all" ? "any category" : CATEGORY_LABELS[category])}
        />
      ) : (
        children
      )}

      {status !== "LoadingFirstPage" && count > 0 && (
        <div className="flex flex-col items-center gap-2 border-t border-border pt-6 text-center" aria-live="polite">
          {status === "Exhausted" ? (
            <p className="max-w-md text-muted-foreground">{copy.endOfFeed}</p>
          ) : (
            <Button variant="outline" size="lg" onClick={loadMore} disabled={status === "LoadingMore"}>
              {status === "LoadingMore" ? "Loading…" : "Show more"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
