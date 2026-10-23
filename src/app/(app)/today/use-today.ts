'use client';

import { useQuery } from '@tanstack/react-query';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';

/** One day of Today: shown from the cache at once when it is there, and refreshed in the background. */
export const useTodayData = (date: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.today(date),
    queryFn: () => {
      return dataSource.today(date);
    },
  });
};
