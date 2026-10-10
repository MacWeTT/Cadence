import { useMemo, useSyncExternalStore } from 'react';

// Checks every 15 seconds, but the snapshot is the current minute, so subscribers only re-render when it changes.
const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 15_000);

  return () => {
    return window.clearInterval(id);
  };
};

/** The browser clock, to the minute. `null` on the server and during hydration, so nothing depends on it too early. */
export const useNow = (): Date | null => {
  const minute = useSyncExternalStore(
    subscribe,
    () => {
      return Math.floor(Date.now() / 60_000);
    },
    () => {
      return null;
    },
  );

  return useMemo(() => {
    return minute === null ? null : new Date(minute * 60_000);
  }, [minute]);
};
