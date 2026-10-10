'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { Alert, AlertTier } from '@/lib/alert';
import { useMsg } from '@/lib/use-msg';
import { cn } from '@/lib/utils';
import './alert-banner.css';

const ICONS: Record<Exclude<AlertTier, 'none'>, string> = {
  morning: '☀️',
  afternoon: '⏳',
  evening: '🔥',
  late: '🚨',
  done: '✅',
};

const focusHabit = (id: string) => {
  const checkbox = document.getElementById(`check-${id}`);

  checkbox?.scrollIntoView({ block: 'center' });
  checkbox?.focus();
};

interface AlertBannerProps {
  alert: Alert | null;
}

/**
 * The one message about how the day is going. `null` means the clock is not known yet: the space is held so the page
 * does not jump. A hidden polite live region announces it, but only when the tier or the habit it names changes: the
 * visible message carries a countdown that changes every minute, which must not be read out every minute.
 */
export const AlertBanner = (props: AlertBannerProps) => {
  const { alert } = props;

  const tm = useMsg();

  const action = alert?.action ?? null;
  const message = alert?.message ? tm(alert.message) : '';
  const spokenKey = `${alert?.tier}:${action?.kind === 'focus' ? action.id : ''}`;

  const spoken = useMemo(() => {
    return message;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed to `spokenKey`, not to the message
  }, [spokenKey]);

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {spoken}
      </div>
      {alert === null && <div className="alert-banner__placeholder" />}
      {alert && alert.tier !== 'none' && (
        <div data-testid="banner" className={cn('alert-banner', `alert-banner--${alert.tier}`)}>
          <span aria-hidden className={cn('alert-banner__icon', alert.tier === 'late' && 'alert-banner__icon--pulse')}>
            {ICONS[alert.tier]}
          </span>
          <p className="alert-banner__message">{message}</p>
          {action?.kind === 'focus' && (
            <button
              type="button"
              onClick={() => {
                return focusHabit(action.id);
              }}
              className="alert-banner__action"
            >
              {tm(action.label)}
            </button>
          )}
          {action?.kind === 'link' && (
            <Link href={action.href} className="alert-banner__action">
              {tm(action.label)}
            </Link>
          )}
        </div>
      )}
    </>
  );
};
