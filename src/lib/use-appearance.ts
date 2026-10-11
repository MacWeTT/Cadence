'use client';

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_ACCENT,
  DEFAULT_PALETTE,
  readChoice,
  readCustomHex,
  restoreChoices,
  writeChoice,
  writeCustomAccent,
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

const getCustomHex = () => {
  return readCustomHex(document.documentElement);
};

const serverCustomHex = () => {
  return null;
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

const chooseCustom = (hex: string): boolean => {
  const applied = writeCustomAccent(hex, document.documentElement, getStorage());

  notify();

  return applied;
};

/** The current theme and accent, and setters for them. The page itself is restyled by the attributes on <html>. */
export const useAppearance = () => {
  const palette: Palette = useSyncExternalStore(subscribe, getPalette, serverPalette);
  const accent: Accent = useSyncExternalStore(subscribe, getAccent, serverAccent);
  const customHex: string | null = useSyncExternalStore(subscribe, getCustomHex, serverCustomHex);

  const setPalette = (value: Palette) => {
    choose('palette', value);
  };

  const setAccent = (value: Accent) => {
    choose('accent', value);
  };

  /** Makes any colour the accent; false (and no change) when the text is not a colour. */
  const setCustomAccent = (hex: string) => {
    return chooseCustom(hex);
  };

  return { palette, accent, customHex, setPalette, setAccent, setCustomAccent };
};
