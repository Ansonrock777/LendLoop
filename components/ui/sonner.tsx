"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, TriangleAlert, CircleAlert, Loader2 } from "lucide-react"

/*
 * Toasts: paper card with an ink edge, icon coloured by meaning. Short confirmations only;
 * the screen itself always shows the new state too (DESIGN.md "Toasts").
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme ?? "light") as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-[18px] text-success-foreground" />,
        info: <Info className="size-[18px] text-primary" />,
        warning: <TriangleAlert className="size-[18px] text-attention-foreground" />,
        error: <CircleAlert className="size-[18px] text-destructive" />,
        loading: <Loader2 className="size-[18px] animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!shadow-raised !font-sans !gap-3 !px-4 !py-3.5",
          title: "!text-[0.9375rem] !font-medium !leading-snug",
          description: "!text-sm !text-muted-foreground",
          closeButton: "!bg-popover !border-border !text-muted-foreground hover:!text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
