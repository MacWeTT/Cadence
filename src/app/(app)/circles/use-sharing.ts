'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  setCirclesPausedAction,
  setShareAction,
  setShareOverrideAction,
  type CircleActionResult,
} from '@/app/(app)/circles/actions';
import type { Label, Level } from '@/domain/circles';
import { withOverride, withPaused, withShare } from '@/lib/circle-sharing-optimistic';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';
import type { SharingView } from '@/server/circle-sharing-view';

/** What the person shares with one circle: shown from the cache at once when it is there. */
export const useSharing = (circleId: string) => {
  return useQuery({
    queryKey: queryKeys.circleSharing(circleId),
    queryFn: () => {
      return fetchJson<SharingView>(`/api/circles/${circleId}/sharing`);
    },
  });
};

/** A failure the server explained in words, as opposed to a network error. */
class ActionError extends Error {}

/**
 * Runs a sharing action and shows its result at once, before the server answers. If the server refuses, the screen goes
 * back to what it was and a toast says why; after any outcome the circles are read again.
 */
const useSharingMutation = <Input>(
  circleId: string,
  action: (input: Input) => Promise<CircleActionResult>,
  apply: (view: SharingView, input: Input) => SharingView,
) => {
  const queryClient = useQueryClient();
  const t = useTranslations('errors');
  const key = queryKeys.circleSharing(circleId);

  return useMutation({
    mutationFn: async (input: Input) => {
      const { ok, error } = await action(input);

      if (!ok) {
        throw new ActionError(error);
      }
    },
    onMutate: async (input: Input) => {
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<SharingView>(key);

      queryClient.setQueryData<SharingView>(key, view => {
        return view ? apply(view, input) : view;
      });

      return { previous };
    },
    onError: (error, _input, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast.error(error instanceof ActionError ? error.message : t('generic'));
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.circles });
    },
  });
};

interface ShareInput {
  habitId: string;
  circleId: string;
  level: Level;
  label?: Label;
}

/** How much of a habit this circle sees (and how it is named to them). */
export const useSetShare = (circleId: string) => {
  return useSharingMutation<ShareInput>(circleId, setShareAction, (view, { habitId, level, label }) => {
    return withShare(view, habitId, level, label);
  });
};

interface OverrideInput {
  habitId: string;
  circleId: string;
  viewerId: string;
  level: Level | 'inherit';
  label: Label;
}

/** One person's level for a habit, in place of the circle's. `inherit` removes it. */
export const useSetOverride = (circleId: string) => {
  return useSharingMutation<OverrideInput>(circleId, setShareOverrideAction, (view, input) => {
    const { habitId, viewerId, level, label } = input;

    return withOverride(view, habitId, viewerId, level, label);
  });
};

/** The pause-sharing switch, which holds for every circle. */
export const useSetPaused = (circleId: string) => {
  return useSharingMutation<boolean>(circleId, setCirclesPausedAction, withPaused);
};
