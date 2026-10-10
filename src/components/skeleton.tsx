import { cn } from "@/lib/utils";

/** A pulsing placeholder block, shown while a page's data loads so the layout holds its shape instead of collapsing. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-line/60 motion-reduce:animate-none", className)} />;
}

/** A page title with a stack of row-shaped placeholders under it (Today and Habits). */
export function ListSkeleton({ title }: { title: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
      <h1 className="font-display text-4xl">{title}</h1>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}

/** The Progress page's shape: filter chips, then three cards. */
export function ProgressSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading progress" className="mt-6 space-y-6">
      <Skeleton className="h-8 w-80 rounded-full" />
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
