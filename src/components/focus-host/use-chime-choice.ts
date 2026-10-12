'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { updateSoundAction } from '@/app/(app)/profile/actions';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { DEFAULT_CHOICE, parseChoice, type ChimeChoice } from '@/lib/chimes';
import { withSound } from '@/lib/profile-optimistic';
import { queryKeys } from '@/lib/query/keys';
import type { ProfileView } from '@/server/profile-view';

/** Where the chime lived before it moved to the account: this browser's storage. Read once and copied up. */
const LEGACY_KEY = 'cadence.chime';
const SAVE_DELAY_MS = 400;

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
 * The chime and volume, kept on the account so they follow the person to a new phone. A choice made on this browser
 * before that (the old local value) is copied up once. A change shows at once; the save waits a moment so dragging the
 * volume is one request (a different sound is saved at once), and it makes no toast (the profile page's own edits do).
 */
export const useChimeChoice = (): [ChimeChoice, (choice: ChimeChoice) => void] => {
  const queryClient = useQueryClient();
  const { data } = useProfile();
  const timer = useRef<number | undefined>(undefined);
  const copied = useRef(false);

  const save = useCallback(
    (choice: ChimeChoice) => {
      const { id, volume } = choice;
      const before = queryClient.getQueryData<ProfileView>(queryKeys.profile)?.sound.id;

      queryClient.setQueryData<ProfileView>(queryKeys.profile, view => {
        return view && withSound(view, { id, volume });
      });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(
        () => {
          void updateSoundAction({ id, volume }).then(result => {
            if (!result.ok) {
              toast.error(result.error);
            }

            return queryClient.invalidateQueries({ queryKey: queryKeys.profile });
          });
        },
        before === id ? SAVE_DELAY_MS : 0,
      );
    },
    [queryClient],
  );

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

  if (!data) {
    return [DEFAULT_CHOICE, save];
  }

  const { sound, customSounds } = data;
  const custom = customSounds.find(({ id }) => {
    return id === sound.id;
  });

  return [{ ...sound, url: custom?.url ?? null }, save];
};
