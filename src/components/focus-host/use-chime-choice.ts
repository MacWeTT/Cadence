'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { updateSoundAction } from '@/app/(app)/profile/actions';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { DEFAULT_CHOICE, parseChoice, sessionChoice, type ChimeChoice } from '@/lib/chimes';
import { queryKeys } from '@/lib/query/keys';

/** Where the chime lived before it moved to the account: this browser's storage. Read once and copied up. */
const LEGACY_KEY = 'cadence.chime';

const readLegacy = (): string => {
  try {
    return window.localStorage.getItem(LEGACY_KEY) ?? '';
  } catch {
    return '';
  }
};

const clearLegacy = (): void => {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // storage blocked: nothing to clear
  }
};

/**
 * The default sound and volume, kept on the account (the profile page changes them) so they follow the person to a new
 * phone. A choice made on this browser before that (the old local value) is copied up once.
 */
export const useChimeChoice = (): ChimeChoice => {
  const queryClient = useQueryClient();
  const { data } = useProfile();
  const copied = useRef(false);

  // Copy the old local choice up once, unless the account already has a choice of its own.
  useEffect(() => {
    if (!data || copied.current) {
      return;
    }

    copied.current = true;

    const raw = readLegacy();

    if (raw === '') {
      return;
    }

    const { id: savedId, volume: savedVolume } = data.sound;
    const untouched = savedId === DEFAULT_CHOICE.id && savedVolume === DEFAULT_CHOICE.volume;

    if (untouched) {
      const { id, volume } = parseChoice(raw);

      void updateSoundAction({ id, volume }).then(() => {
        return queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      });
    }

    clearLegacy();
  }, [data, queryClient]);

  const sound = data?.sound;
  const customSounds = data?.customSounds;

  return useMemo(() => {
    if (!sound) {
      return DEFAULT_CHOICE;
    }

    const custom = customSounds?.find(({ id }) => {
      return id === sound.id;
    });

    return { ...sound, url: custom?.url ?? null };
  }, [sound, customSounds]);
};

/** The sound for one session: the one it carries, or the default. Never changes the default. */
export const useSessionChime = (soundId: string | null): ChimeChoice => {
  const base = useChimeChoice();
  const { data } = useProfile();
  const customSounds = data?.customSounds;

  return useMemo(() => {
    return sessionChoice(soundId, base, customSounds ?? []);
  }, [soundId, base, customSounds]);
};
