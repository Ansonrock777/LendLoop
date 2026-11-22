import type { ReactNode } from "react";

/** Flat token fills. Outlines are always 2px --art-line (stroke-art-line on the svg). */
export const F = {
  blue: "fill-art-blue",
  amber: "fill-art-amber",
  sage: "fill-art-sage",
  tint: "fill-tint",
  ink: "fill-art-line",
} as const;

export function Art({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full stroke-art-line [stroke-width:2.25]"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const strokeOf = { blue: "stroke-art-blue", amber: "stroke-art-amber", sage: "stroke-art-sage" } as const;

/** A thick outlined tube (handles, hoses): 2px outline around a flat colour, no gradients. */
export function Tube({ d, color }: { d: string; color: keyof typeof strokeOf }) {
  return (
    <>
      <path d={d} strokeWidth={9} />
      <path d={d} strokeWidth={5} className={strokeOf[color]} />
    </>
  );
}
