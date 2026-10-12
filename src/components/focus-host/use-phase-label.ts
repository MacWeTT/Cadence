'use client';

import { useTranslations } from 'next-intl';
import type { SessionView } from '@/lib/focus-clock';

/** "Focus, round 2 of 4", "Break, next: round 3", "Focusing" or "All rounds done". */
export const usePhaseLabel = (view: SessionView): string => {
  const t = useTranslations('focus.running');
  const { phase, round, rounds } = view;

  switch (phase) {
    case 'free':
      return t('free');
    case 'done':
      return t('done');
    case 'break':
      return t('break', { next: round + 1 });
    default:
      return t('focus', { round, rounds });
  }
};
