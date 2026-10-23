'use client';

import { useQuery } from '@tanstack/react-query';
import { setCirclesPausedAction, setShareAction, setShareOverrideAction } from '@/app/(app)/circles/actions';
import { useOptimisticCircleAction } from '@/app/(app)/circles/use-optimistic-circle-action';
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

interface ShareInput {
  habitId: string;
  circleId: string;
  level: Level;
  label?: Label;
}

/** How much of a habit this circle sees (and how it is named to them). */
export const useSetShare = (circleId: string) => {
  return useOptimisticCircleAction<SharingView, ShareInput>(
    queryKeys.circleSharing(circleId),
    setShareAction,
    (view, { habitId, level, label }) => {
      return withShare(view, habitId, level, label);
    },
  );
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
  return useOptimisticCircleAction<SharingView, OverrideInput>(
    queryKeys.circleSharing(circleId),
    setShareOverrideAction,
    (view, input) => {
      const { habitId, viewerId, level, label } = input;

      return withOverride(view, habitId, viewerId, level, label);
    },
  );
};

/** The pause-sharing switch, which holds for every circle. */
export const useSetPaused = (circleId: string) => {
  return useOptimisticCircleAction<SharingView, boolean>(
    queryKeys.circleSharing(circleId),
    setCirclesPausedAction,
    withPaused,
  );
};
