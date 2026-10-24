'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useHomeData } from '@/app/(app)/home/use-home';
import { clockIn } from '@/lib/alert';
import { homeAlert } from '@/lib/home-alert';
import { notify } from '@/lib/notify';
import { useMsg } from '@/lib/use-msg';

/** How often the day is looked at, so a tier is noticed within a minute of starting. */
const CHECK_EVERY_MS = 60_000;

/** The tiers worth a notification: the ones where something is about to be lost. The rest stay on the Home banner. */
const NOTIFY_TIERS = new Set(['evening', 'late']);

const storage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * The desktop app's Home alert as a real notification, whichever page is open: once for each of the evening and the late
 * warning on a day, and only while something is still open. Home's own banner is unchanged.
 */
export const AlertNotifier = () => {
  const tc = useTranslations('common');
  const tm = useMsg();
  const { data } = useHomeData();

  useEffect(() => {
    if (!data) {
      return;
    }

    const check = () => {
      const now = new Date();
      const { tier, message } = homeAlert(data, now);
      const key = `cadence:alert:${clockIn(data.timezone, now).date}:${tier}`;
      const kept = storage();

      if (!message || !NOTIFY_TIERS.has(tier) || kept?.getItem(key)) {
        return;
      }

      kept?.setItem(key, '1');
      notify(tc('appName'), tm(message));
    };

    check();

    const timer = window.setInterval(check, CHECK_EVERY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [data, tc, tm]);

  return null;
};
