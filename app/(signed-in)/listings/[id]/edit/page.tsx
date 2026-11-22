"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { QueryBoundary } from "@/components/app/query-boundary";
import { ToolForm } from "@/components/app/tool-form";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { copy } from "@/lib/copy";

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <QueryBoundary key={id} notFound={{ message: copy.listingNotFound, href: "/listings", label: "Back to my listings" }}>
      <EditTool toolId={id as Id<"tools">} />
    </QueryBoundary>
  );
}

/** `tools.getMine` answers only the owner (requireToolOwner); anyone else sees "not found". */
function EditTool({ toolId }: { toolId: Id<"tools"> }) {
  const tool = useQuery(api.tools.getMine, { toolId });
  const updateTool = useMutation(api.tools.update);

  if (tool === undefined) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title={`Edit ${tool.name.toLowerCase()}`} />
      <ToolForm
        initial={{ name: tool.name, category: tool.category, condition: tool.condition, description: tool.description }}
        submitLabel="Save changes"
        onSubmit={async ({ category, ...draft }) => {
          if (!category) throw new Error("category missing");
          await updateTool({ toolId, ...draft, category });
          return copy.toolUpdated(draft.name);
        }}
      />
    </>
  );
}
