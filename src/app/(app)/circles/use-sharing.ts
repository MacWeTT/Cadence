'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  setCirclesPausedAction,
  setShareAction,
  setShareMissesAction,
  setShareOverrideAction,
} from '@/app/(app)/circles/actions';
import { useOptimisticCircleAction } from '@/app/(app)/circles/use-optimistic-circle-action';
import type { Label, Level } from '@/domain/circles';
import { withMisses, withOverride, withPaused, withShare } from '@/lib/circle-sharing-optimistic';
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
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<SharingView, ShareInput>(
    queryKeys.circleSharing(circleId),
    setShareAction,
    (view, { habitId, level, label }) => {
      return withShare(view, habitId, level, label);
    },
    t('saved'),
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
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<SharingView, OverrideInput>(
    queryKeys.circleSharing(circleId),
    setShareOverrideAction,
    (view, input) => {
      const { habitId, viewerId, level, label } = input;

      return withOverride(view, habitId, viewerId, level, label);
    },
    t('saved'),
  );
};

/** The pause-sharing switch, which holds for every circle. */
export const useSetPaused = (circleId: string) => {
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<SharingView, boolean>(
    queryKeys.circleSharing(circleId),
    setCirclesPausedAction,
    withPaused,
    t('saved'),
  );
};

interface MissesInput {
  habitId: string;
  circleId: string;
  on: boolean;
}

/** Whether a partner is shown this habit's off days. */
export const useSetShareMisses = (circleId: string) => {
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<SharingView, MissesInput>(
    queryKeys.circleSharing(circleId),
    setShareMissesAction,
    (view, { habitId, on }) => {
      return withMisses(view, habitId, on);
    },
    t('saved'),
  );
};
