import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tactile skeleton block used inside loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border-2 border-border/20 bg-muted",
        className,
      )}
      aria-hidden
    />
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="reveal space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="surface p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-3/5" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="surface p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-20" />
        </div>
        <div className="surface p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-7 w-20" />
        </div>
      </div>
      <p className="text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface reveal flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border-2 border-border bg-sky text-sky-foreground shadow-[3px_3px_0_0_var(--ink)]">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </span>
      <div>
        <p className="font-display text-lg font-extrabold">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="surface reveal flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border-2 border-border bg-coral text-coral-foreground shadow-[3px_3px_0_0_var(--ink)]">
        <AlertCircle className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-semibold">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
