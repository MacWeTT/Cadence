'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';
import type { TodayData } from '@/server/today';

/** One day of Today: shown from the cache at once when it is there, and refreshed in the background. */
export const useTodayData = (date: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.today(date),
    queryFn: () => {
      return fetchJson<TodayData>(date ? `/api/today?date=${date}` : '/api/today');
    },
  });
};
