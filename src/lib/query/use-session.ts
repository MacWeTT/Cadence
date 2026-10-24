'use client';

import { useQuery } from '@tanstack/react-query';
import { local } from '@/data/local';
import { queryKeys } from '@/lib/query/keys';

/** Who is signed in on the desktop app (`undefined` while it is being read, `null` for nobody). Desktop screens only. */
export const useSession = () => {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => {
      return local.currentUser();
    },
  });
};
