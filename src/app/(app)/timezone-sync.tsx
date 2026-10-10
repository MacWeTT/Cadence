'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { syncTimezoneAction } from './timezone-actions';

const FLAG = 'timezone-synced';

/**
 * Once per browser session, offers the browser's timezone to the server (which only saves it over the UTC default).
 * When it is saved the page refreshes, so "today" is computed in the user's own timezone from then on.
 */
export const TimezoneSync = () => {
  const router = useRouter();

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
          router.refresh();
        }
      })
      .catch(() => {});
  }, [router]);

  return null;
};
