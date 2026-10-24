'use client';

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { dataSource } from '@/data';
import type { CalendarDate } from '@/domain/dates';
import { haptic, hapticForTick } from '@/lib/haptics';
import { queryKeys } from '@/lib/query/keys';
import { applyToggle, type TodayRow, type TodayView } from '@/server/today-view';

interface Toggle {
  id: string;
  date: CalendarDate;
  ticked: boolean;
}

/** A cached page that holds a Today view: a Today day, or Home. */
interface Holder {
  view: TodayView;
  date?: CalendarDate;
  today?: CalendarDate;
}

class SaveError extends Error {}

/** Applies a tick to a cached page, but only if the page is showing the day that was ticked. */
const applyTo = (holder: Holder, change: Toggle): Holder => {
  const { view, date, today } = holder;
  const { id, date: tickedOn, ticked } = change;

  return (date ?? today) === tickedOn ? { ...holder, view: applyToggle(view, id, ticked) } : holder;
};

/**
 * Ticking for any page that shows a Today view: the row moves at once in every cached page that shows that day (Today
 * and Home), one request per row at a time. If the save fails the pages are put back as they were and a toast says so;
 * either way the data is then refreshed from the server. Also keeps keyboard focus on the row as it changes list.
 */
export const useCachedToggle = (view: TodayView | undefined) => {
  const queryClient = useQueryClient();
  const t = useTranslations('errors');

  const focusId = useRef<string | null>(null);

  const mutationKey = ['toggle'] as const;

  const mutation = useMutation({
    mutationKey,
    mutationFn: async ({ id, date, ticked }: Toggle) => {
      const result = await dataSource.setCompletion(id, date, ticked);

      if (!result.ok) {
        throw new SaveError(result.error);
      }
    },
    onMutate: async (change: Toggle) => {
      const keys = [queryKeys.todayAll, queryKeys.home];

      await Promise.all(
        keys.map(queryKey => {
          return queryClient.cancelQueries({ queryKey });
        }),
      );

      const previous = keys.flatMap(queryKey => {
        return queryClient.getQueriesData<Holder>({ queryKey });
      });

      previous.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<Holder>(queryKey, applyTo(data, change));
        }
      });

      return { previous };
    },
    onError: (error, _change, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });

      haptic('error');
      toast.error(error instanceof SaveError ? error.message : t('saveFailed'));
    },
    onSettled: () => {
      return queryClient.invalidateQueries();
    },
  });

  // The rows being saved, so a second tap on one is ignored and its box shows it is busy.
  const pending = useMutationState({
    filters: { mutationKey, status: 'pending' },
    select: mutationState => {
      return (mutationState.state.variables as Toggle).id;
    },
  });
  const saving: ReadonlySet<string> = new Set(pending);

  // A ticked row moves to the other list, which remounts its button and drops keyboard focus; put it back. Only when the
  // lists change, so a page that re-renders for other reasons (Home's clock) never pulls focus back from where you went.
  useEffect(() => {
    if (focusId.current && document.activeElement === document.body) {
      document.getElementById(`check-${focusId.current}`)?.focus();
    }
  }, [view]);

  // Once you press or click anything else, focus is yours: stop restoring it.
  useEffect(() => {
    const forget = () => {
      focusId.current = null;
    };

    document.addEventListener('pointerdown', forget);
    document.addEventListener('keydown', forget);

    return () => {
      document.removeEventListener('pointerdown', forget);
      document.removeEventListener('keydown', forget);
    };
  }, []);

  const toggle = (row: TodayRow, date: CalendarDate) => {
    const { id, ticked: wasTicked } = row;

    if (saving.has(id)) {
      return;
    }

    focusId.current = id;

    // Ticking something on is a small success, on the tap itself; taking a tick back is quiet.
    if (!wasTicked) {
      haptic(hapticForTick(view?.todo ?? [], id));
    }

    mutation.mutate({ id, date, ticked: !wasTicked });
  };

  return { saving, toggle };
};
