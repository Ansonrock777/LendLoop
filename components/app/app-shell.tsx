"use client";

import { useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowLeftRight, ChevronDown, Inbox, LayoutGrid, LogOut, Monitor, Moon, Package, Plus, Shield, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Wordmark } from "./page-header";
import { QueryBoundary } from "./query-boundary";

const TABS = [
  { href: "/", label: "Browse", icon: LayoutGrid },
  { href: "/listings", label: "My listings", short: "Listings", icon: Package },
  { href: "/requests", label: "My requests", short: "Requests", icon: ArrowLeftRight },
  { href: "/incoming", label: "Incoming", icon: Inbox },
] as const;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Signed-in frame. Desktop: paper top bar with an ink underline on the current page. Phone: bottom tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  // Name + admin flag from `users.me` (no email). It is null until users.store has created
  // the caller's row on first sign-in, so pages wait for it instead of racing that mutation.
  const me = useQuery(api.users.me);
  const ready = !!me;
  const pendingIncoming = useQuery(api.loans.pendingIncomingCount, ready ? {} : "skip") ?? 0;
  const isAdmin = me?.isAdmin ?? false;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-raised"
      >
        Skip to content
      </a>
      <header className="material sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <Link href="/" className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/35" aria-label="LendLoop home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="hidden h-full flex-1 items-stretch gap-1 md:flex">
            {TABS.map((t) => (
              <NavLink key={t.href} href={t.href} active={isActive(path, t.href)}>
                {t.label}
                {t.href === "/incoming" && pendingIncoming > 0 && <Count n={pendingIncoming} />}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink href="/admin" active={isActive(path, "/admin")}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" className="h-9">
              <Link href="/list">
                <Plus aria-hidden data-icon="inline-start" />
                <span className="max-sm:sr-only">List a tool</span>
              </Link>
            </Button>
            <UserMenu firstName={me?.firstName} isAdmin={isAdmin} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 sm:px-6 md:pt-12 md:pb-16">
        {ready ? (
          <QueryBoundary key={path}>{children}</QueryBoundary>
        ) : (
          <div className="space-y-4" aria-busy="true" aria-label="Setting up your account">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        )}
      </main>

      <nav aria-label="Main" className="material fixed inset-x-0 bottom-0 z-30 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(path, t.href);
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-16 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span aria-hidden className={cn("absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-opacity", active ? "opacity-100" : "opacity-0")} />
                  <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                  {"short" in t ? t.short : t.label}
                  {t.href === "/incoming" && pendingIncoming > 0 && (
                    <span className="absolute top-2 left-1/2 ml-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-attention-line bg-attention px-1 text-[11px] font-semibold text-attention-foreground tabular">
                      {pendingIncoming}
                      <span className="sr-only"> pending</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-1.5 rounded-sm px-3 text-[0.9375rem] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
        "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity",
        active ? "text-foreground after:opacity-100" : "text-muted-foreground after:opacity-0 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-attention-line bg-attention px-1.5 text-[11px] font-semibold text-attention-foreground tabular">
      {n}
      <span className="sr-only"> pending</span>
    </span>
  );
}

function UserMenu({ firstName, isAdmin }: { firstName?: string; isAdmin: boolean }) {
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();
  const initial = firstName?.charAt(0).toUpperCase() ?? "·";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-2 pr-2 pl-1" aria-label="Account menu">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-art-blue font-heading text-[0.95rem] font-medium text-foreground">
            {initial}
          </span>
          <span className="max-md:hidden">{firstName ?? "Account"}</span>
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground max-md:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 font-normal">
          <span className="block text-2xs text-muted-foreground">Signed in as</span>
          <span className="font-heading text-lede font-medium">{firstName ?? "Neighbour"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-2xs font-normal text-muted-foreground">Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden /> Match device
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuItem asChild className="md:hidden">
              <Link href="/admin">
                <Shield aria-hidden /> Admin
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut({ redirectUrl: "/" })}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
