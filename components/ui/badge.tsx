import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
 * Two shapes on purpose (DESIGN.md):
 * - tags (category, condition): small square-ish labels, no fill noise.
 * - status (attention/success/...): rounded with an icon, the only "pill" in the app.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/35 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "h-6 rounded-full border-transparent bg-primary px-2 text-xs text-primary-foreground",
        secondary: "h-6 rounded-full border-transparent bg-secondary px-2.5 text-xs text-muted-foreground",
        destructive: "h-6 rounded-full border-destructive/30 bg-destructive/8 px-2.5 text-xs text-destructive",
        outline: "h-6 rounded-full border-border-strong bg-transparent px-2.5 text-xs text-foreground",
        ghost: "h-6 rounded-full border-transparent px-2 text-xs hover:bg-accent",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
        attention: "h-6 rounded-full border-attention-line bg-attention px-2.5 text-xs text-attention-foreground",
        success: "h-6 rounded-full border-success-line bg-success px-2.5 text-xs text-success-foreground",
        tag: "h-[1.375rem] rounded-sm border-border-strong bg-transparent px-1.5 text-label font-normal text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
