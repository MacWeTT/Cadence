'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { parseChoice, type ChimeChoice } from '@/lib/chimes';

const KEY = 'cadence.chime';

const listeners = new Set<() => void>();

const subscribe = (notify: () => void) => {
  listeners.add(notify);

  return () => {
    listeners.delete(notify);
  };
};

const read = (): string => {
  try {
    return window.localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
};

const readOnServer = (): string => {
  return '';
};

/**
 * The chime and volume, kept on this device. shortcut: local storage only; when the profile page exists the choice
 * moves to the account so it follows the person to a new phone.
 */
export const useChimeChoice = (): [ChimeChoice, (choice: ChimeChoice) => void] => {
  const raw = useSyncExternalStore(subscribe, read, readOnServer);

  const save = useCallback((choice: ChimeChoice) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(choice));
    } catch {
      // storage blocked: the choice lasts until the page is closed
    }

    for (const listener of listeners) {
      listener();
    }
  }, []);

  return [parseChoice(raw), save];
};
