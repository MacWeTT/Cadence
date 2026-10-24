'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FocusContext, type FocusApi, type FocusTarget } from '@/components/focus-host/focus-context';
import { tickedIn } from '@/components/focus-host/ticked-in';
import { usePhaseChime } from '@/components/focus-host/use-phase-chime';
import { useTabTitle } from '@/components/focus-host/use-tab-title';
import { useFocusActions, useFocusState, useServerNow, type StartInput } from '@/components/focus-host/use-focus';
import { applyEnding } from '@/components/focus-host/apply-ending';
import { expectedResult, timezoneOf } from '@/components/focus-host/expected-result';
import { FocusPanel } from '@/components/focus-panel/focus-panel';
import { playChime, unlockAudio } from '@/lib/chimes';
import { sessionView } from '@/lib/focus-clock';
import { queryKeys } from '@/lib/query/keys';
import { useSessionChime } from '@/components/focus-host/use-chime-choice';
import type { FocusResult } from '@/server/focus';

interface FocusHostProps {
  children: React.ReactNode;
}

interface HostState {
  panelOpen: boolean;
  target: FocusTarget | null;
  result: FocusApi['result'];
  error: string | null;
  didIt: boolean;
  countIt: boolean;
}

/**
 * Holds the focus session for the whole app: the clock, the chime and notification at each phase change, the tab title,
 * and what the panel shows. The bar and the panel read it from the context.
 */
export const FocusHost = (props: FocusHostProps) => {
  const { children } = props;

  const [state, setState] = useState<HostState>({
    panelOpen: false,
    target: null,
    result: null,
    error: null,
    didIt: true,
    countIt: true,
  });

  const queryClient = useQueryClient();
  const t = useTranslations('focus');
  const { data, dataUpdatedAt } = useFocusState();
  const { start, stop, skip, pause, resume } = useFocusActions();

  const stopping = useRef(false);
  /** The Stop in flight (it resolves, never fails): Done waits on it in the background, never on screen. */
  const stopped = useRef<Promise<unknown>>(Promise.resolve());
  /** Set when a stop failed, so a session that ran out is not retried in a loop; the Stop button still works. */
  const gaveUp = useRef(false);
  /** Set when the person skips a break, so the jump to the next round is not announced as a phase that ended. */
  const quiet = useRef(false);

  const session = data?.running ?? null;
  // The profile sound is the default; a session may carry its own.
  const choice = useSessionChime(session?.soundId ?? null);
  const now = useServerNow(data, dataUpdatedAt, session !== null);
  const view = session ? sessionView(session, now) : null;
  const { panelOpen, target, result, error, didIt, countIt } = state;
  const pending = start.isPending || stop.isPending || skip.isPending || pause.isPending || resume.isPending;

  const phase = view?.phase;
  const round = view?.round;
  const clock = view?.clock;
  const phaseKey = session && phase ? `${session.id}:${phase}:${round}` : null;
  const name = session?.habit.name;

  useTabTitle(name, clock);

  // Browsers only play sound after a touch, and a reloaded page has had none yet: the first touch unlocks audio.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
    };
  }, []);

  usePhaseChime(phaseKey, phase, name, choice, quiet);

  /** Whether the habit is ticked for the day in what the pages have read so far. */
  const isTicked = (habitId: string) => {
    return tickedIn(
      [
        ...queryClient.getQueriesData({ queryKey: queryKeys.todayAll }),
        ...queryClient.getQueriesData({ queryKey: queryKeys.home }),
      ],
      habitId,
    );
  };

  const finish = (finished: FocusResult | null, habitName: string) => {
    if (finished && !finished.saved) {
      toast.message(t('ending.tooShort'));
    }

    if (!finished?.saved) {
      setState(current => {
        return { ...current, panelOpen: false, result: null };
      });

      return;
    }

    const { habitId } = finished;

    playChime(choice, 'done');
    const ticked = isTicked(habitId);

    setState(current => {
      return {
        ...current,
        panelOpen: true,
        didIt: true,
        countIt: true,
        result: { ...finished, name: habitName, ticked },
      };
    });
  };

  const onStop = () => {
    if (!session) {
      return;
    }

    const { habit } = session;
    const habitName = habit.name;
    const wasOpen = panelOpen;

    gaveUp.current = false;
    // Everything answers at once: the timer is already gone from the cache, and the "Session finished" window opens now with
    // the result worked out here. The server catches up behind it, and its answer only confirms or corrects the window.
    finish(expectedResult(session, now, timezoneOf(queryClient)), habitName);

    const request = stop.mutateAsync();

    stopped.current = request.catch(() => {
      return null;
    });
    request
      .then(finished => {
        if (!finished || !finished.saved) {
          finish(finished, habitName);

          return;
        }

        const { habitId } = finished;

        setState(current => {
          const { result: shown } = current;

          return shown ? { ...current, result: { ...shown, ...finished, ticked: isTicked(habitId) } } : current;
        });
      })
      .catch((e: Error) => {
        gaveUp.current = true;
        setState(current => {
          return { ...current, panelOpen: wasOpen, result: null };
        });
        toast.error(e.message);
      })
      .finally(() => {
        stopping.current = false;
      });
  };

  // A plan that has run out (or the free cap) ends by itself, once.
  const done = view?.done ?? false;

  useEffect(() => {
    if (done && !stopping.current && !gaveUp.current) {
      stopping.current = true;
      onStop();
    }
    // onStop is recreated every render; the session ending is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Closing the ending panel, by Done, the X or Escape, applies both boxes as they stand. "I did it" ticks the habit for
  // the day; "Count this time in focus", when unticked, drops the session so its minutes are not counted. They are independent.
  const confirm = () => {
    setState(current => {
      return { ...current, panelOpen: false, result: null };
    });

    if (result) {
      // the window is already closed: both boxes are applied in the background, after the Stop they depend on has landed
      void applyEnding(queryClient, result, { didIt, countIt }, stopped.current);
    }
  };

  const onError = (e: Error) => {
    toast.error(e.message);
  };

  const api: FocusApi = {
    session,
    view,
    plans: data?.plans ?? {},
    sounds: data?.sounds ?? {},
    panelOpen,
    target,
    result,
    pending,
    error,
    didIt,
    setDidIt: (value: boolean) => {
      setState(current => {
        return { ...current, didIt: value };
      });
    },
    countIt,
    setCountIt: (value: boolean) => {
      setState(current => {
        return { ...current, countIt: value };
      });
    },
    openFor: habit => {
      setState(current => {
        return { ...current, panelOpen: true, target: habit, error: null };
      });
    },
    openRunning: () => {
      setState(current => {
        return { ...current, panelOpen: true, target: null };
      });
    },
    closePanel: () => {
      if (result) {
        confirm();

        return;
      }

      setState(current => {
        return { ...current, panelOpen: false, result: null, error: null };
      });
    },
    start: (input: StartInput) => {
      unlockAudio();

      if ('Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission();
      }

      start.mutate(input, {
        onError: e => {
          setState(current => {
            return { ...current, error: e.message };
          });
        },
      });
    },
    stop: onStop,
    skip: () => {
      quiet.current = true;
      skip.mutate(undefined, {
        onError: e => {
          quiet.current = false;
          toast.error(e.message);
        },
      });
    },
    pause: () => {
      pause.mutate(undefined, { onError });
    },
    resume: () => {
      resume.mutate(undefined, { onError });
    },
    confirm,
  };

  return (
    <FocusContext.Provider value={api}>
      {children}
      <FocusPanel />
    </FocusContext.Provider>
  );
};
