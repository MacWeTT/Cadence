'use client';

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_ACCENT,
  DEFAULT_PALETTE,
  readChoice,
  restoreChoices,
  writeChoice,
  type Accent,
  type Kind,
  type Palette,
} from './appearance';

const listeners = new Set<() => void>();

const noStorage = {
  getItem: () => {
    return null;
  },
  setItem: () => {},
};

/** localStorage, or a stand-in that remembers nothing when the browser blocks it. */
const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return noStorage;
  }
};

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  // Another tab changed the look: take its choice, so every open tab agrees.
  const onStorage = () => {
    restoreChoices(document.documentElement, getStorage());
    notify();
  };

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

const getPalette = () => {
  return readChoice('palette', document.documentElement);
};

const getAccent = () => {
  return readChoice('accent', document.documentElement);
};

const serverPalette = () => {
  return DEFAULT_PALETTE;
};

const serverAccent = () => {
  return DEFAULT_ACCENT;
};

const choose = (kind: Kind, value: string) => {
  writeChoice(kind, value, document.documentElement, getStorage());
  notify();
};

/** The current theme and accent, and setters for them. The page itself is restyled by the attributes on <html>. */
export const useAppearance = () => {
  const palette: Palette = useSyncExternalStore(subscribe, getPalette, serverPalette);
  const accent: Accent = useSyncExternalStore(subscribe, getAccent, serverAccent);

  const setPalette = (value: Palette) => {
    choose('palette', value);
  };

  const setAccent = (value: Accent) => {
    choose('accent', value);
  };

  return { palette, accent, setPalette, setAccent };
};
