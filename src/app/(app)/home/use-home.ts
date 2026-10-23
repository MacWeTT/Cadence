'use client';

import { useQuery } from '@tanstack/react-query';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';

/** The Home page's data: shown from the cache at once when it is there, and refreshed in the background. */
export const useHomeData = () => {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: () => {
      return dataSource.home();
    },
  });
};
