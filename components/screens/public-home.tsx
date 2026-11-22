"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import { Wordmark } from "@/components/app/page-header";
import { PublicFeed } from "@/components/app/tool-feed";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import type { Category } from "@/convex/lib/domain";
import { copy } from "@/lib/copy";

/** A few real drawings from the board, laid out like things on a shed shelf. Decorative. */
const SHELF: { name: string; category: Category; className: string }[] = [
  { name: "Lawnmower", category: "garden", className: "col-span-2 row-span-2" },
  { name: "Cordless drill", category: "power_tools", className: "" },
  { name: "Stand mixer", category: "kitchen", className: "" },
  { name: "Tent", category: "camping", className: "" },
  { name: "Step ladder", category: "hand_tools", className: "" },
];

/** Signed-out home. Only tool name + category ever reach this page: `tools.publicList` returns nothing else (SECURITY.md rule 2). */
export function PublicHome() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-raised"
      >
        Skip to content
      </a>
      <header className="material sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm" className="h-9">
              Sign in
            </Button>
          </SignInButton>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-20 lg:gap-16">
            <div className="space-y-6">
              <p className="text-sm font-medium text-clay">A lending board for your street</p>
              <h1 className="font-heading text-display font-medium tracking-[-0.02em] sm:text-display-lg">
                Borrow what you need. <span className="text-muted-foreground italic">Lend what you don&apos;t.</span>
              </h1>
              <p className="max-w-[46ch] text-lede text-muted-foreground">
                See what neighbours can lend, ask for the days you need it, and hand it back when you&apos;re done.
              </p>
              <div className="flex flex-wrap gap-3">
                <SignUpButton mode="modal">
                  <Button size="lg">Join your neighbours</Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button size="lg" variant="outline">
                    I already have an account
                  </Button>
                </SignInButton>
              </div>
              <p className="flex max-w-[52ch] items-start gap-2.5 border-t border-border pt-5 text-sm text-muted-foreground">
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                {copy.privacy}
              </p>
            </div>

            <div aria-hidden className="grid grid-cols-3 grid-rows-2 gap-3 max-md:hidden">
              {SHELF.map((s) => (
                <ToolArt key={s.name} name={s.name} category={s.category} className={`h-full w-full ${s.className}`} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-sunken/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-heading text-display-sm font-medium tracking-[-0.015em]">Shared nearby</h2>
              <p className="text-sm text-muted-foreground">Sign in to see who&apos;s lending and when it&apos;s free.</p>
            </div>
            <PublicFeed />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <Wordmark className="text-lede" />
          <p>Built as a take-home project. Demo data only.</p>
        </div>
      </footer>
    </div>
  );
}
