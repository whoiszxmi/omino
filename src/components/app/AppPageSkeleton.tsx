"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AppPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 md:px-6 md:py-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 animate-pulse rounded-2xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
        <Skeleton className="h-4 w-64 animate-pulse rounded-2xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
      </div>

      <div className="grid gap-3">
        <Skeleton className="h-12 w-full animate-pulse rounded-2xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
        <Skeleton className="h-12 w-full animate-pulse rounded-2xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
      </div>

      {!compact ? (
        <>
          <Skeleton className="h-28 w-full animate-pulse rounded-3xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
          <Skeleton className="h-28 w-full animate-pulse rounded-3xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
          <Skeleton className="h-28 w-full animate-pulse rounded-3xl bg-gradient-to-r from-muted via-muted/70 to-muted" />
        </>
      ) : null}
    </div>
  );
}
