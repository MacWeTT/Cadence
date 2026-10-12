'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FocusContext, type FocusApi, type FocusTarget } from '@/components/focus-host/focus-context';
import { useTabTitle } from '@/components/focus-host/use-tab-title';
import { useFocusActions, useFocusState, useServerNow, type StartInput } from '@/components/focus-host/use-focus';
import { FocusPanel } from '@/components/focus-panel/focus-panel';
import { playChime, unlockAudio } from '@/lib/chimes';
import { sessionView } from '@/lib/focus-clock';
import { queryKeys } from '@/lib/query/keys';
import { useChimeChoice } from '@/lib/use-chime-choice';
import type { FocusResult } from '@/server/focus';
import { setCompletionAction } from '@/app/(app)/today/actions';
import type { TodayRow, TodayView } from '@/server/today-view';

interface FocusHostProps {
  children: React.ReactNode;
}

interface HostState {
  panelOpen: boolean;
  target: FocusTarget | null;
  result: FocusApi['result'];
  error: string | null;
  didIt: boolean;
}

/** Whether the cache already shows the habit ticked on that day (a tick is idempotent, so a miss is harmless). */
const tickedIn = (views: [unknown, unknown][], habitId: string): boolean => {
  return views.some(([, data]) => {
    const { view } = (data ?? {}) as { view?: TodayView };
    const { done, optional } = view ?? { done: [], optional: [] };
    const rows: TodayRow[] = [...done, ...optional];

    return rows.some(({ id, ticked }) => {
      return id === habitId && ticked;
    });
  });
};

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
  });

  const queryClient = useQueryClient();
  const t = useTranslations('focus');
  const { data, dataUpdatedAt } = useFocusState();
  const { start, stop, skip } = useFocusActions();
  const [choice] = useChimeChoice();

  const seen = useRef<string | null>(null);
  const stopping = useRef(false);
  /** Set when the person skips a break, so the jump to the next round is not announced as a phase that ended. */
  const quiet = useRef(false);

  const session = data?.running ?? null;
  const now = useServerNow(data, dataUpdatedAt, session !== null);
  const view = session ? sessionView(session, now) : null;
  const { panelOpen, target, result, error, didIt } = state;
  const pending = start.isPending || stop.isPending || skip.isPending;

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

  // A chime, and a notification if allowed, at every phase change after the first one seen for a session.
  useEffect(() => {
    if (!phaseKey || !phase || !name) {
      seen.current = null;

      return;
    }

    const previous = seen.current;

    seen.current = phaseKey;

    if (previous === null || previous === phaseKey || previous.split(':')[0] !== phaseKey.split(':')[0]) {
      return;
    }

    const wasQuiet = quiet.current;

    quiet.current = false;

    // skipping a break is the person's own doing, not a phase that ended
    if (wasQuiet) {
      return;
    }

    // the end of the whole session sounds from `finish`, once it is saved
    if (phase !== 'done') {
      playChime(choice, previous.split(':')[1] === 'break' ? 'break' : 'focus');
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const body =
        phase === 'break' ? t('notify.focusDone') : phase === 'done' ? t('notify.allDone') : t('notify.breakDone');

      new Notification(name, { body });
    }
  }, [phaseKey, phase, name, choice, t]);

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
    const ticked = tickedIn(
      [
        ...queryClient.getQueriesData({ queryKey: queryKeys.todayAll }),
        ...queryClient.getQueriesData({ queryKey: queryKeys.home }),
      ],
      habitId,
    );

    setState(current => {
      return { ...current, panelOpen: true, didIt: true, result: { ...finished, name: habitName, ticked } };
    });
  };

  const onStop = () => {
    const habitName = session?.habit.name ?? '';

    stop.mutate(undefined, {
      onSuccess: finished => {
        finish(finished, habitName);
      },
      onError: e => {
        toast.error(e.message);
      },
      onSettled: () => {
        stopping.current = false;
      },
    });
  };

  // A plan that has run out (or the free cap) ends by itself, once.
  const done = view?.done ?? false;

  useEffect(() => {
    if (done && !stopping.current) {
      stopping.current = true;
      onStop();
    }
    // onStop is recreated every render; the session ending is the only trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Closing the ending panel, by Done, the X or Escape, applies "I did it" as it stands.
  const confirm = async () => {
    if (didIt && result && !result.ticked) {
      const { habitId, date } = result;
      const response = await setCompletionAction(habitId, date, true);

      if (!response.ok) {
        toast.error(response.error);

        return;
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.todayAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.progressAll });
    }

    setState(current => {
      return { ...current, panelOpen: false, result: null };
    });
  };

  const api: FocusApi = {
    session,
    view,
    plans: data?.plans ?? {},
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
        void confirm();

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
    confirm,
  };

  return (
    <FocusContext.Provider value={api}>
      {children}
      <FocusPanel />
    </FocusContext.Provider>
  );
};
