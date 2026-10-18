'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, type RefObject } from 'react';
import type { FocusPhase } from '@/domain/focus';
import { playChime, type ChimeChoice } from '@/lib/chimes';

/**
 * A chime, and a notification if allowed, at every phase change after the first one seen for a session. `quiet` is set
 * when the person skips a break, so the jump to the next round is not announced as a phase that ended.
 */
export const usePhaseChime = (
  phaseKey: string | null,
  phase: FocusPhase | 'free' | undefined,
  name: string | undefined,
  choice: ChimeChoice,
  quietRef: RefObject<boolean>,
) => {
  const t = useTranslations('focus');
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!phaseKey || !phase || !name) {
      seen.current = null;

      return;
    }

    const previous = seen.current;

    seen.current = phaseKey;

    if (previous === null || previous === phaseKey || previous.split(':')[0] !== phaseKey.split(':')[0]) {
      return;
    }

    const wasQuiet = quietRef.current;

    quietRef.current = false;

    // skipping a break is the person's own doing, not a phase that ended
    if (wasQuiet) {
      return;
    }

    // the end of the whole session sounds from `finish`, once it is saved
    if (phase !== 'done') {
      playChime(choice, previous.split(':')[1] === 'break' ? 'break' : 'focus');
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const body =
        phase === 'break' ? t('notify.focusDone') : phase === 'done' ? t('notify.allDone') : t('notify.breakDone');

      new Notification(name, { body });
    }
  }, [phaseKey, phase, name, choice, t, quietRef]);
};
