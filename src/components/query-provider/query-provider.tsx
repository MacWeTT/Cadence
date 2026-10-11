'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { makeQueryClient } from '@/lib/query/query-client';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * The page data cache for the signed-in app. It lives as long as this component does, so leaving the app (signing out)
 * drops it, and the next person to sign in on this tab starts empty.
 */
export const QueryProvider = (props: QueryProviderProps) => {
  const { children } = props;

  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
