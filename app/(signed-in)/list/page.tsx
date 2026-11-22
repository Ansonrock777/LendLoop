"use client";

import { useMutation } from "convex/react";
import { PageHeader } from "@/components/app/page-header";
import { ToolForm } from "@/components/app/tool-form";
import { api } from "@/convex/_generated/api";
import { copy } from "@/lib/copy";

export default function ListToolPage() {
  const createTool = useMutation(api.tools.create);
  return (
    <>
      <PageHeader title="List a tool" description="Neighbours see the name, category and condition. Your email stays private." />
      <ToolForm
        submitLabel="List it"
        onSubmit={async ({ category, ...draft }) => {
          // The form blocks submit until a category is picked; the server validates it again.
          if (!category) throw new Error("category missing");
          await createTool({ ...draft, category });
          return copy.toolListed(draft.name);
        }}
      />
    </>
  );
}
