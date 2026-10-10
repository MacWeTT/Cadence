import { cn } from '@/lib/utils';

/** A pulsing placeholder block, shown while a page's data loads so the layout holds its shape instead of collapsing. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('animate-pulse rounded-xl bg-line/60 motion-reduce:animate-none', className)} />
  );
}

/** A page title with a stack of row-shaped placeholders under it (Today and Habits). */
export function ListSkeleton({ title }: { title: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
      <h1 className="font-display text-4xl">{title}</h1>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map(i => (
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

/** The Home page's shape: header row, banner, then the two columns. */
export function HomeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading home">
      <div className="flex items-center gap-5">
        <Skeleton className="size-22 rounded-full" />
        <Skeleton className="h-12 w-80" />
      </div>
      <Skeleton className="mt-6 h-13 rounded-2xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
