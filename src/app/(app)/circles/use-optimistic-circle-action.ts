'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { CircleActionResult } from '@/app/(app)/circles/actions';
import { haptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query/keys';

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

/**
 * Runs a Circles action and shows its result on screen at once, before the server answers. If the server refuses, the screen goes
 * back to what it was and a toast says why; after any outcome the circles are read again.
 */
export const useOptimisticCircleAction = <Data, Input>(
  key: QueryKey,
  action: (input: Input) => Promise<CircleActionResult>,
  apply: (data: Data, input: Input) => Data,
) => {
  const queryClient = useQueryClient();
  const t = useTranslations('errors');

  return useMutation({
    mutationFn: async (input: Input) => {
      const { ok, error } = await action(input);

      if (!ok) {
        throw new ActionError(error);
      }
    },
    onMutate: async (input: Input) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<Data>(key);

      queryClient.setQueryData<Data>(key, view => {
        return view ? apply(view, input) : view;
      });

      return { previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(key, context?.previous);
      haptic('error');
      toast.error(error instanceof ActionError ? error.message : t('generic'));
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.circles });
    },
  });
};
