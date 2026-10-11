'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';
import type { HomeData } from '@/server/home';

/** The Home page's data: shown from the cache at once when it is there, and refreshed in the background. */
export const useHomeData = () => {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: () => {
      return fetchJson<HomeData>('/api/home');
    },
  });
};
