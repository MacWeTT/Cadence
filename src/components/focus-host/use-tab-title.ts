'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { tabTitle } from '@/lib/focus-clock';

/** What the tab title looks like while the countdown is in it: "16:42 · Read". */
const COUNTDOWN_TITLE = /^\d+:\d{2}(:\d{2})? · /;

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);

  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
};

const readHidden = (): boolean => {
  return document.hidden;
};

const readVisible = (): boolean => {
  return false;
};

/**
 * While the tab is in the background its title carries the time, so a session can be read at a glance. The page's own
 * title is captured as the tab is left (it is never touched while visible, because Next does not rewrite it after a
 * navigation) and put back when the tab is shown or the session ends.
 */
export const useTabTitle = (name: string | undefined, clock: number | undefined) => {
  const baseTitle = useRef('');
  const hidden = useSyncExternalStore(subscribeVisibility, readHidden, readVisible);

  useEffect(() => {
    if (!name || clock === undefined) {
      return;
    }

    if (!hidden) {
      if (COUNTDOWN_TITLE.test(document.title)) {
        document.title = baseTitle.current;
      }

      return;
    }

    if (!COUNTDOWN_TITLE.test(document.title)) {
      baseTitle.current = document.title;
    }

    document.title = tabTitle(clock, name);
  }, [name, clock, hidden]);

  useEffect(() => {
    if (!name) {
      return;
    }

    return () => {
      if (COUNTDOWN_TITLE.test(document.title)) {
        document.title = baseTitle.current;
      }
    };
  }, [name]);
};
