import { QueryClient } from '@tanstack/react-query';

/** How long data counts as fresh: a page visited again within this time shows its cached data without asking again. */
export const STALE_MS = 30_000;

/**
 * One cache for the browser, in memory only (nothing is written to disk, so it is gone when the tab closes). Cached data
 * is shown at once and refreshed quietly in the background when it is stale, and again when the tab is shown.
 */
export const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_MS, gcTime: 10 * 60_000, refetchOnWindowFocus: true, retry: 1 },
    },
  });
};
