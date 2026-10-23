'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { dataSource, type ActionResult } from '@/data';
import { queryKeys } from '@/lib/query/keys';
import { archiveInView, removeFromView, restoreInView } from '@/server/habits-optimistic';
import type { HabitsView } from '@/server/habits';

/** The Habits page's data: shown from the cache at once when it is there, and refreshed in the background. */
export const useHabitsView = () => {
  return useQuery({
    queryKey: queryKeys.habits,
    queryFn: () => {
      return dataSource.habits();
    },
  });
};

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

interface Change {
  action: (id: string) => Promise<ActionResult>;
  apply: (view: HabitsView, id: string) => HabitsView;
  success: string;
}

/**
 * Archive, restore and delete answer at once: the list changes before the server has replied. If the server refuses (or the
 * network fails) the list goes back as it was and a toast says so; either way the cache is then refreshed from the server.
 */
const useChange = (change: Change) => {
  const { action, apply, success } = change;

  const queryClient = useQueryClient();
  const t = useTranslations('errors');

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await action(id);

      if (!result.ok) {
        throw new ActionError(result.error);
      }
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.habits });

      const previous = queryClient.getQueryData<HabitsView>(queryKeys.habits);

      if (previous) {
        queryClient.setQueryData<HabitsView>(queryKeys.habits, apply(previous, id));
      }

      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData<HabitsView>(queryKeys.habits, context.previous);
      }

      toast.error(error instanceof ActionError ? error.message : t('generic'));
    },
    onSuccess: () => {
      toast.success(success);
    },
    onSettled: () => {
      return queryClient.invalidateQueries();
    },
  });
};

export const useArchiveHabit = () => {
  const t = useTranslations('habits.toasts');

  return useChange({
    action: dataSource.archiveHabit,
    apply: (view, id) => {
      return archiveInView(view, id, new Date().toISOString());
    },
    success: t('archived'),
  });
};

export const useDeleteHabit = () => {
  const t = useTranslations('habits.toasts');

  return useChange({ action: dataSource.deleteHabit, apply: removeFromView, success: t('deleted') });
};

export const useRestoreHabit = () => {
  const t = useTranslations('habits.toasts');

  return useChange({ action: dataSource.restoreHabit, apply: restoreInView, success: t('restored') });
};
