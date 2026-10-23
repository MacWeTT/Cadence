'use client';

import { sendCheerAction, setCirclePrefsAction } from '@/app/(app)/circles/actions';
import { useOptimisticCircleAction } from '@/app/(app)/circles/use-optimistic-circle-action';
import { withCheered, withPrefs } from '@/lib/circle-social-optimistic';
import { queryKeys } from '@/lib/query/keys';
import type { CircleView } from '@/server/circles-view';

interface CheerInput {
  circleId: string;
  toUser: string;
  /** The friend's own today. */
  forDate: string;
}

/** A cheer for a friend's day. The friend shows as cheered at once. */
export const useCheer = (circleId: string) => {
  return useOptimisticCircleAction<CircleView, CheerInput>(
    queryKeys.circle(circleId),
    sendCheerAction,
    (view, input) => {
      return withCheered(view, input.toUser);
    },
  );
};

interface PrefsInput {
  circleId: string;
  inWeek: boolean;
  allowCheers: boolean;
}

/** Whether your week counts towards the circle's, and whether friends can cheer you. */
export const useSetPrefs = (circleId: string) => {
  return useOptimisticCircleAction<CircleView, PrefsInput>(
    queryKeys.circle(circleId),
    setCirclePrefsAction,
    (view, input) => {
      const { inWeek, allowCheers } = input;

      return withPrefs(view, inWeek, allowCheers);
    },
  );
};
