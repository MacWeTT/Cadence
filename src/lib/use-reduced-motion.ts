import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (notify: () => void) => {
  const media = window.matchMedia(QUERY);

  media.addEventListener('change', notify);

  return () => {
    media.removeEventListener('change', notify);
  };
};

const read = () => {
  return window.matchMedia(QUERY).matches;
};

const readOnServer = () => {
  return false;
};

/**
 * Whether the person asked for less motion. Unlike motion's own hook it reads `false` while hydrating, so the first
 * client render matches the server's HTML, and then switches to the real answer.
 */
export const useReducedMotion = () => {
  return useSyncExternalStore(subscribe, read, readOnServer);
};
