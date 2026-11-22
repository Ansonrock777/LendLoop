"use client";

import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * The other person's email. Rendered only when the server sends it, which it does
 * only for an approved, not-yet-returned loan between these two people.
 */
export function PickupContact({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-success-line bg-success px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="text-2xs font-medium text-success-foreground">Arrange pickup with {name}</p>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-2 rounded-xs font-medium break-all text-foreground underline decoration-success-line underline-offset-4 outline-none hover:decoration-success-foreground focus-visible:ring-3 focus-visible:ring-ring/35"
        >
          <Mail aria-hidden className="size-4 shrink-0 text-success-foreground" />
          {email}
        </a>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(email);
            toast.success("Email copied.");
          } catch {
            toast.error("Couldn't copy. You can select the address instead.");
          }
        }}
      >
        <Copy aria-hidden data-icon="inline-start" />
        Copy
      </Button>
    </div>
  );
}
