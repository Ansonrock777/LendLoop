"use client";

import Link from "next/link";
import { Component, type ReactNode } from "react";
import { ToolArt } from "@/components/tool-art";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { appErrorData } from "@/lib/errors";
import { EmptyState } from "./page-header";

type Props = {
  children: ReactNode;
  /** Shown when the server says the thing doesn't exist or isn't yours (NOT_FOUND / FORBIDDEN / bad id). */
  notFound?: { message: string; href: string; label: string };
};

/**
 * Convex `useQuery` throws when the server refuses (not yours, removed, signed out)
 * or the connection fails. This catches it and shows one calm sentence instead of a
 * crashed page. The raw error never reaches the screen. Give it a `key` that changes
 * with the route so moving to another page clears the error.
 */
export class QueryBoundary extends Component<Props, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;

    const code = appErrorData(error)?.code;
    // A malformed id in the URL fails argument validation before any auth check: treat it as "not found".
    const missing = code === "NOT_FOUND" || code === "FORBIDDEN" || (!code && /ArgumentValidationError|Validator/.test(String(error)));
    const nf = this.props.notFound;

    if (missing && nf) {
      return (
        <EmptyState
          art={<ToolArt name="" category="other" frame="none" />}
          message={nf.message}
          action={
            <Button asChild>
              <Link href={nf.href}>{nf.label}</Link>
            </Button>
          }
        />
      );
    }

    return (
      <EmptyState
        art={<ToolArt name="" category="other" frame="none" />}
        message={code === "UNAUTHENTICATED" ? copy.signInAgain : copy.loadError}
        action={
          <Button variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        }
      />
    );
  }
}
