'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';
import type { ProgressData } from '@/server/progress';
import { progressHref } from '@/app/(app)/progress/progress-links';

/**
 * The Progress page's data for one filter and window: shown from the cache at once when it is there, and refreshed in
 * the background. While a filter that was never opened loads, the previous one stays on screen instead of a skeleton.
 */
export const useProgressData = (habit: string | null, range: number) => {
  return useQuery({
    queryKey: queryKeys.progress(habit, range),
    queryFn: () => {
      return fetchJson<ProgressData>(`/api${progressHref(habit, range)}`);
    },
    placeholderData: keepPreviousData,
  });
};
