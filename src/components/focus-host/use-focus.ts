'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';
import {
  pauseFocusAction,
  resumeFocusAction,
  skipBreakAction,
  startFocusAction,
  stopFocusAction,
} from '@/app/(app)/focus-actions';
import type { FocusPlan } from '@/domain/focus';
import { offsetFrom } from '@/lib/focus-clock';
import { withoutRunning } from '@/lib/focus-optimistic';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';
import type { FocusResult } from '@/server/focus';
import type { FocusState } from '@/server/focus-view';

/** The running session, refetched when the tab is shown so another device's changes arrive. */
export const useFocusState = () => {
  return useQuery({
    queryKey: queryKeys.focus,
    queryFn: () => {
      return dataSource.focus();
    },
  });
};

const readSecond = (): number => {
  return Math.floor(Date.now() / 1000) * 1000;
};

const readOnServer = (): number => {
  return 0;
};

/** The current time on the database's clock, to the second, ticking every second while `active`. */
export const useServerNow = (state: FocusState | undefined, updatedAt: number, active: boolean) => {
  // useCallback keeps the subscription from being redone on every render
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!active) {
        return () => {};
      }

      const timer = window.setInterval(onChange, 1000);

      return () => {
        window.clearInterval(timer);
      };
    },
    [active],
  );
  const browserNow = useSyncExternalStore(subscribe, readSecond, readOnServer);

  return browserNow + (state ? offsetFrom(state.serverNow, updatedAt) : 0);
};

export interface StartInput {
  habitId: string;
  mode: 'free' | 'pomodoro';
  plan: FocusPlan | null;
  /** The sound for this session; `null` follows the profile's sound. */
  soundId: string | null;
}

class FocusError extends Error {}

/** Start, stop, skip, pause and resume: each runs the server action, then refreshes the session and Progress. */
export const useFocusActions = () => {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.focus });
    void queryClient.invalidateQueries({ queryKey: queryKeys.progressAll });
  };

  const run = async (work: () => ReturnType<typeof stopFocusAction>): Promise<FocusResult | null> => {
    const response = await work();

    if (!response.ok) {
      const { error } = response;

      throw new FocusError(error);
    }

    await refresh();

    return response.result;
  };

  const start = useMutation({
    mutationFn: (input: StartInput) => {
      return run(() => {
        return startFocusAction(input);
      });
    },
  });
  // Stop is shown at once: the session leaves the cache now, and the server's answer (refetched in `run`) replaces it.
  // If the stop fails, the session goes back as it was, with the time it was fetched at so the clock does not jump.
  const stop = useMutation({
    mutationFn: () => {
      return run(stopFocusAction);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.focus });

      const previous = queryClient.getQueryData<FocusState>(queryKeys.focus);
      const updatedAt = queryClient.getQueryState(queryKeys.focus)?.dataUpdatedAt;

      queryClient.setQueryData<FocusState | undefined>(queryKeys.focus, withoutRunning);

      return { previous, updatedAt };
    },
    onError: (_error, _input, context) => {
      const { previous, updatedAt } = context ?? {};

      if (previous) {
        queryClient.setQueryData(queryKeys.focus, previous, { updatedAt });
      }
    },
  });
  const skip = useMutation({
    mutationFn: () => {
      return run(skipBreakAction);
    },
  });

  const pause = useMutation({
    mutationFn: () => {
      return run(pauseFocusAction);
    },
  });
  const resume = useMutation({
    mutationFn: () => {
      return run(resumeFocusAction);
    },
  });

  return { start, stop, skip, pause, resume };
};
