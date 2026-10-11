'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { syncTimezoneAction } from '@/app/(app)/timezone-actions';
import { whenVisible } from '@/lib/when-visible';

const FLAG = 'timezone-synced';

/**
 * Once per browser session, offers the browser's timezone to the server (which only saves it over the UTC default).
 * When it is saved the cached pages are refetched, so "today" is computed in the user's own timezone from then on.
 */
export const TimezoneSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG)) {
        return;
      }
    } catch {
      return; // storage unavailable (private mode): skip rather than retry on every page
    }

    syncTimezoneAction(Intl.DateTimeFormat().resolvedOptions().timeZone)
      .then(saved => {
        // Set the flag only after the server answered, so a failed attempt is retried.
        try {
          sessionStorage.setItem(FLAG, '1');
        } catch {}

        if (saved) {
          whenVisible(() => {
            void queryClient.invalidateQueries();
          });
        }
      })
      .catch(() => {});
  }, [queryClient]);

  return null;
};
