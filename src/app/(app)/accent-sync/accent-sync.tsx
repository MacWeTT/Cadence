'use client';

import { useCallback, useEffect, useRef } from 'react';
import { dataSource } from '@/data';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { DEFAULT_ACCENT, type Accent } from '@/lib/appearance';
import { useAppearance } from '@/lib/use-appearance';

const SAVE_DELAY_MS = 500;

const keyOf = (accent: Accent, customHex: string | null): string => {
  return accent === 'custom' ? `custom:${customHex}` : accent;
};

/**
 * Keeps the app accent on the account, so it follows the person to a new device. The browser still decides first (the
 * boot script paints the saved accent before anything loads); this only reconciles once the profile arrives:
 * an accent on the account is applied here, and an accent chosen here before the account had one is saved to it.
 * After that, every change made here is saved a moment later. Quiet: no toast, and a failed save is tried again on the
 * next change.
 */
export const AccentSync = () => {
  const { data } = useProfile();
  const { accent, customHex, setAccent, setCustomAccent } = useAppearance();

  // The accent the account is known to hold ('' for none), or undefined until the profile has been reconciled once.
  const known = useRef<string | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);

  const push = useCallback((next: Accent, hex: string | null) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void dataSource.updateAccent({ accent: next, customHex: next === 'custom' ? hex : null }).then(result => {
        if (result.ok) {
          known.current = keyOf(next, hex);
        }
      });
    }, SAVE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!data || known.current !== undefined) {
      return;
    }

    const { accent: stored } = data;

    if (!stored) {
      // The account has none: keep this browser's, if it ever chose one (the stock accent is not a choice).
      known.current = '';

      if (accent !== DEFAULT_ACCENT) {
        push(accent, customHex);
      }

      return;
    }

    const { accent: preset, customHex: hex } = stored;

    // Set before applying, so applying it is not mistaken for a change made here.
    known.current = keyOf(preset, hex);

    if (preset === 'custom' && hex) {
      setCustomAccent(hex);
    } else if (preset !== accent) {
      setAccent(preset);
    }
  }, [data, accent, customHex, push, setAccent, setCustomAccent]);

  useEffect(() => {
    if (known.current === undefined || keyOf(accent, customHex) === known.current) {
      return;
    }

    // Nothing is saved over an account with none until something other than the stock accent is chosen.
    if (known.current === '' && accent === DEFAULT_ACCENT) {
      return;
    }

    push(accent, customHex);
  }, [accent, customHex, push]);

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
    };
  }, []);

  return null;
};
