'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  createCircleAction,
  createInviteAction,
  createPairAction,
  deleteCircleAction,
  joinCircleAction,
  leaveCircleAction,
  removeMemberAction,
  type CircleActionResult,
} from '@/app/(app)/circles/actions';
import { fetchJson, HttpError } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';
import type { CircleListItem, CircleView } from '@/server/circles-view';

/** The person's circles: shown from the cache at once when it is there, and refreshed in the background. */
export const useCircles = () => {
  return useQuery({
    queryKey: queryKeys.circles,
    queryFn: () => {
      return fetchJson<CircleListItem[]>('/api/circles');
    },
  });
};

/** One circle. A circle that is gone, or that the person left, answers not found and is not asked for again. */
export const useCircle = (id: string) => {
  return useQuery({
    queryKey: queryKeys.circle(id),
    queryFn: () => {
      return fetchJson<CircleView>(`/api/circles/${id}`);
    },
    retry: (count, error) => {
      return !(error instanceof HttpError && error.status === 404) && count < 1;
    },
  });
};

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

/**
 * Runs one of the Circles actions. A refusal (or a network failure) is a toast that says why; after any outcome the
 * circles are read again, so the screens show what the server holds.
 */
const useCircleAction = <Input, Value>(
  action: (input: Input) => Promise<CircleActionResult<Value>>,
  success?: string,
) => {
  const queryClient = useQueryClient();
  const t = useTranslations('errors');

  return useMutation({
    mutationFn: async (input: Input) => {
      const { ok, value, error } = await action(input);

      if (!ok) {
        throw new ActionError(error);
      }

      return value;
    },
    onError: error => {
      toast.error(error instanceof ActionError ? error.message : t('generic'));
    },
    onSuccess: () => {
      if (success) {
        toast.success(success);
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.circles });
    },
  });
};

export const useCreateCircle = () => {
  const t = useTranslations('circles.toasts');

  return useCircleAction(createCircleAction, t('created'));
};

/** A new invite link; the old ones stop working. */
export const useCreateInvite = () => {
  return useCircleAction(createInviteAction);
};

/** Starts a pair, a circle for two. The id of the new pair comes back. */
export const useCreatePair = () => {
  return useCircleAction(createPairAction);
};

export const useJoinCircle = () => {
  const t = useTranslations('circles.toasts');

  return useCircleAction(joinCircleAction, t('joined'));
};

export const useLeaveCircle = () => {
  const t = useTranslations('circles.toasts');

  return useCircleAction(leaveCircleAction, t('left'));
};

export const useCloseCircle = () => {
  const t = useTranslations('circles.toasts');

  return useCircleAction(deleteCircleAction, t('closed'));
};

export const useRemoveMember = () => {
  const t = useTranslations('circles.toasts');

  return useCircleAction(removeMemberAction, t('removed'));
};
