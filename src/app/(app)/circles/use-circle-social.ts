'use client';

import { useTranslations } from 'next-intl';
import { reactAction, setCircleLookAction, setCirclePrefsAction, setCloserAction } from '@/app/(app)/circles/actions';
import { useOptimisticCircleAction } from '@/app/(app)/circles/use-optimistic-circle-action';
import type { CircleColor, Reaction } from '@/domain/circles';
import type { CalendarDate } from '@/domain/dates';
import { withCloser, withLook, withPrefs, withReaction } from '@/lib/circle-social-optimistic';
import { queryKeys } from '@/lib/query/keys';
import type { CircleView } from '@/server/circles-view';

interface ReactInput {
  circleId: string;
  toUser: string;
  /** The friend's day the reaction is for. */
  forDate: CalendarDate;
  emoji: Reaction;
  on: boolean;
  /** You, and your tag: only used to show the reaction at once, before the server answers. */
  me: string;
  myTag: string;
}

/** An emoji on a friend's day, or taking it back. It shows at once and goes back if the server refuses. */
export const useReact = (circleId: string) => {
  return useOptimisticCircleAction<CircleView, ReactInput>(queryKeys.circle(circleId), reactAction, (view, input) => {
    const { toUser, forDate, emoji, on, me, myTag } = input;

    return withReaction(view, { me, myTag, toUser, date: forDate, emoji, on });
  });
};

interface PrefsInput {
  circleId: string;
  inWeek: boolean;
  allowCheers: boolean;
}

/** Whether your week counts towards the circle's, and whether friends can react to you. */
export const useSetPrefs = (circleId: string) => {
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<CircleView, PrefsInput>(
    queryKeys.circle(circleId),
    setCirclePrefsAction,
    (view, input) => {
      const { inWeek, allowCheers } = input;

      return withPrefs(view, inWeek, allowCheers);
    },
    t('saved'),
  );
};

interface LookInput {
  circleId: string;
  color: CircleColor;
  pinned: boolean;
}

/** Your own colour for a circle, and whether it is pinned to the top of your list. */
export const useSetLook = (circleId: string) => {
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<CircleView, LookInput>(
    queryKeys.circle(circleId),
    setCircleLookAction,
    (view, { color, pinned }) => {
      return withLook(view, color, pinned);
    },
    t('saved'),
  );
};

interface CloserInput {
  circleId: string;
  on: boolean;
}

/** Your own Closer switch for a pair. It shows at once, and is on for both only when both have turned it on. */
export const useSetCloser = (circleId: string) => {
  const t = useTranslations('circles.toasts');

  return useOptimisticCircleAction<CircleView, CloserInput>(
    queryKeys.circle(circleId),
    setCloserAction,
    (view, { on }) => {
      return withCloser(view, on);
    },
    t('saved'),
  );
};
