"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { BadgeCheck, CircleAlert, History, Package, ScrollText } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_LABELS, LIMITS } from "@/convex/lib/domain";
import { AUDIT_ACTION_LABELS, copy, FAILED_TYPE_LABELS } from "@/lib/copy";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoment } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Admin console. Hiding it from non-admins is cosmetic: every admin query and
 * mutation calls requireAdmin in Convex (SECURITY.md rule 1). First names only.
 */
export function Admin() {
  const me = useQuery(api.users.me);
  if (me === undefined) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (!me?.isAdmin) {
    return (
      <EmptyState
        art={<ToolArt name="" category="other" frame="none" />}
        message="This page is only for LendLoop admins."
        action={
          <Button asChild>
            <Link href="/">Back to browsing</Link>
          </Button>
        }
      />
    );
  }
  return <AdminConsole />;
}

const NAV = [
  { value: "loans", label: "All loans", icon: ScrollText },
  { value: "listings", label: "Listings", icon: Package },
  { value: "lenders", label: "Trusted Lenders", icon: BadgeCheck },
  { value: "failed", label: "Failed automations", icon: CircleAlert },
  { value: "audit", label: "Audit log", icon: History },
] as const;

type Section = (typeof NAV)[number]["value"];
type PageStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";

const PAGE_SIZE = 25;

/**
 * Loans, listings and the audit log are paginated on the server (max 50 per page),
 * so their tabs show no total: the page only knows what it has loaded (D22).
 */
function AdminConsole() {
  const loans = usePaginatedQuery(api.admin.allLoans, {}, { initialNumItems: PAGE_SIZE });
  const listings = usePaginatedQuery(api.admin.listings, {}, { initialNumItems: PAGE_SIZE });
  const audit = usePaginatedQuery(api.admin.auditLog, {}, { initialNumItems: PAGE_SIZE });
  const lenders = useQuery(api.admin.lenders);
  const failed = useQuery(api.admin.failedAutomations);
  const counts: Partial<Record<Section, number>> = {
    lenders: lenders?.filter((l) => l.trusted).length,
    failed: failed?.length,
  };

  return (
    <>
      <PageHeader title="Admin" description="Keep the board healthy. Every change here is written to the audit log with your name." />
      <Tabs defaultValue="loans" orientation="vertical" className="flex-col gap-6 lg:flex-row lg:gap-10">
        <TabsList
          aria-label="Admin sections"
          className="no-scrollbar h-auto! w-full flex-row! items-stretch justify-start gap-1 overflow-x-auto border-b border-border lg:w-56 lg:shrink-0 lg:flex-col! lg:border-b-0"
        >
          {NAV.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "h-10! shrink-0 justify-start gap-2.5 rounded-md! px-3 after:hidden lg:w-full",
                "data-active:bg-card data-active:text-foreground data-active:shadow-card max-lg:data-active:shadow-none max-lg:rounded-b-none! max-lg:data-active:border-b-2 max-lg:data-active:border-primary",
                "hover:bg-secondary",
              )}
            >
              <Icon aria-hidden className="size-4" />
              <span className="flex-1 text-left">{label}</span>
              {counts[value] !== undefined && (
                <span
                  className={cn(
                    "text-2xs tabular",
                    value === "failed" && counts.failed
                      ? "rounded-full border border-attention-line bg-attention px-1.5 text-attention-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {counts[value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="loans">
            <Panel title="All loans" hint="Across the whole street, newest first. Open one to see its emails and reminders.">
              {loans.status === "LoadingFirstPage" ? (
                <PanelLoading />
              ) : loans.results.length === 0 ? (
                <PanelEmpty text="No loans yet." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead>Lender</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.results.map((l) => (
                      <TableRow key={l._id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/loans/${l._id}`}
                            className="rounded-xs outline-none hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/35"
                          >
                            {l.tool.name}
                          </Link>
                        </TableCell>
                        <TableCell>{l.lenderFirstName}</TableCell>
                        <TableCell>{l.borrowerFirstName}</TableCell>
                        <TableCell className="text-muted-foreground tabular">
                          {formatDate(l.start)} – {formatDate(l.end)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={l.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <MoreRow status={loans.status} onMore={() => loans.loadMore(PAGE_SIZE)} />
            </Panel>
          </TabsContent>

          <TabsContent value="listings">
            <Panel title="Listings" hint="Remove anything unsafe or not a tool. A reason is required.">
              {listings.status === "LoadingFirstPage" ? (
                <PanelLoading />
              ) : listings.results.length === 0 ? (
                <PanelEmpty text="Nothing is listed right now." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tool</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Lender</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.results.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">{CATEGORY_LABELS[t.category]}</TableCell>
                        <TableCell>{t.lenderFirstName}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <RemoveListing id={t._id} name={t.name} lender={t.lenderFirstName} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <MoreRow status={listings.status} onMore={() => listings.loadMore(PAGE_SIZE)} />
            </Panel>
          </TabsContent>

          <TabsContent value="lenders">
            <Panel title="Trusted Lenders" hint="The badge shows on a lender's tools. Give it to people who have lent reliably.">
              {lenders === undefined ? (
                <PanelLoading />
              ) : lenders.length === 0 ? (
                <PanelEmpty text="No one is lending yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {lenders.map((l) => (
                    <TrustedRow key={l._id} id={l._id} name={l.firstName} listings={l.listings} trusted={l.trusted} />
                  ))}
                </ul>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="failed">
            {failed === undefined ? (
              <PanelLoading />
            ) : failed.length === 0 ? (
              <EmptyState message="No failed automations. Everything was delivered." />
            ) : (
              <Panel title="Failed automations" hint="Retries run automatically. These are the ones that still need a look.">
                <ul className="divide-y divide-border">
                  {failed.map((f) => (
                    <li key={f.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
                      <div className="text-sm text-muted-foreground tabular">{formatMoment(f.at)}</div>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {FAILED_TYPE_LABELS[f.type]}{" "}
                          <span className="font-normal text-muted-foreground">
                            ·{" "}
                            {"loanId" in f && f.loanId ? (
                              <Link
                                href={`/loans/${f.loanId}`}
                                className="rounded-xs underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/35"
                              >
                                {f.toolName}
                              </Link>
                            ) : (
                              f.toolName
                            )}
                          </span>
                        </p>
                        <p className="flex items-start gap-2 text-attention-foreground">
                          <CircleAlert aria-hidden className="mt-1 size-4 shrink-0" />
                          {f.error}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </TabsContent>

          <TabsContent value="audit">
            <Panel title="Audit log" hint="Approvals, declines, returns, removals and badge changes, newest first. First names only.">
              {audit.status === "LoadingFirstPage" ? (
                <PanelLoading />
              ) : audit.results.length === 0 ? (
                <PanelEmpty text="Nothing recorded yet." />
              ) : (
                <ul className="divide-y divide-border">
                  {audit.results.map((a) => (
                    <li key={a._id} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
                      <div className="text-sm text-muted-foreground tabular">{formatMoment(a.at)}</div>
                      <div className="space-y-0.5">
                        <p>
                          <span className="font-medium">{a.actorFirstName}</span> <span className="text-muted-foreground">·</span>{" "}
                          {AUDIT_ACTION_LABELS[a.action]}
                        </p>
                        {a.reason && <p className="text-sm text-muted-foreground">Reason: {a.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <MoreRow status={audit.status} onMore={() => audit.loadMore(PAGE_SIZE)} />
            </Panel>
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

/** A titled surface for one admin section. */
function Panel({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-heading text-title font-medium tracking-[-0.01em]">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="overflow-x-auto [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">{children}</div>
    </section>
  );
}

function PanelLoading() {
  return (
    <div className="space-y-2 p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}

function PanelEmpty({ text }: { text: string }) {
  return <p className="px-5 py-6 text-muted-foreground">{text}</p>;
}

function MoreRow({ status, onMore }: { status: PageStatus; onMore: () => void }) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") return null;
  return (
    <div className="flex justify-center border-t border-border p-3">
      <Button variant="outline" size="sm" onClick={onMore} disabled={status === "LoadingMore"}>
        {status === "LoadingMore" ? "Loading…" : "Show more"}
      </Button>
    </div>
  );
}

function RemoveListing({ id, name, lender }: { id: Id<"tools">; name: string; lender: string }) {
  const removeListing = useMutation(api.admin.removeListing);
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const tooLong = trimmed.length > LIMITS.adminReasonMax;

  return (
    <ConfirmAction
      trigger={
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${name}`}>
          Remove
        </Button>
      }
      title={`Remove ${lender}'s ${name.toLowerCase()}?`}
      description="It disappears from the board. The reason is saved in the audit log with your name."
      confirmLabel="Remove listing"
      cancelLabel="Cancel"
      confirmDisabled={!trimmed || tooLong}
      onConfirm={async () => {
        try {
          await removeListing({ toolId: id, reason: trimmed });
          toast.success(`Removed ${name.toLowerCase()}.`);
        } catch (e) {
          toast.error(errorMessage(e));
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={reasonId}>Reason</Label>
        <Textarea id={reasonId} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={`${reasonId}-help`} />
        <p id={`${reasonId}-help`} className={tooLong ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {tooLong ? `Keep it under ${LIMITS.adminReasonMax} characters.` : copy.reasonRequired}
        </p>
      </div>
    </ConfirmAction>
  );
}

function TrustedRow({ id, name, listings, trusted }: { id: Id<"users">; name: string; listings: number; trusted: boolean }) {
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const switchId = useId();
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex min-h-16 items-center justify-between gap-4 px-5 py-3">
      <Label htmlFor={switchId} className="flex items-center gap-3 font-normal">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-art-blue font-heading text-[1.05rem] font-medium">
          {name.charAt(0)}
        </span>
        <span className="flex flex-col">
          <span className="font-medium">
            {name}
            {trusted && <BadgeCheck aria-hidden className="ml-1.5 inline size-4 align-[-2px] text-clay" />}
          </span>
          <span className="text-sm text-muted-foreground tabular">{listings === 1 ? "1 listing" : `${listings} listings`}</span>
        </span>
      </Label>
      <Switch
        id={switchId}
        checked={trusted}
        disabled={busy}
        aria-label={`Trusted Lender: ${name}`}
        onCheckedChange={async (v) => {
          setBusy(true);
          try {
            await setTrusted({ userId: id, trusted: v });
            toast.success(v ? `${name} is now a Trusted Lender.` : `Removed the Trusted Lender badge from ${name}.`);
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </li>
  );
}
