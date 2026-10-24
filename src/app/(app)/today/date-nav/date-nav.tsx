import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { addDays, type CalendarDate } from '@/domain/dates';
import './date-nav.css';
import { Tip } from '@/components/tip/tip';

interface DateNavProps {
  date: CalendarDate;
  today: CalendarDate;
  earliest: CalendarDate;
}

/** Previous and next day, plus a way back to today. The viewed day lives in the URL, so back and reload just work. */
export const DateNav = (props: DateNavProps) => {
  const { date, today, earliest } = props;

  const t = useTranslations('today.nav');

  const href = (d: CalendarDate) => {
    return d === today ? '/today' : `/today?date=${d}`;
  };

  return (
    <nav aria-label={t('label')} className="date-nav">
      {date > earliest ? (
        <Tip label={t('previous')}>
          <Link
            href={href(addDays(date, -1))}
            aria-label={t('previous')}
            className="date-nav__arrow date-nav__arrow--enabled"
          >
            <span aria-hidden>{'‹'}</span>
          </Link>
        </Tip>
      ) : (
        <Tip label={t('previousStopped')}>
          <span
            role="link"
            aria-disabled="true"
            aria-label={t('previous')}
            className="date-nav__arrow date-nav__arrow--disabled"
          >
            <span aria-hidden>{'‹'}</span>
          </span>
        </Tip>
      )}
      {date < today ? (
        <Tip label={t('next')}>
          <Link
            href={href(addDays(date, 1))}
            aria-label={t('next')}
            className="date-nav__arrow date-nav__arrow--enabled"
          >
            <span aria-hidden>{'›'}</span>
          </Link>
        </Tip>
      ) : (
        <Tip label={t('nextStopped')}>
          <span
            role="link"
            aria-disabled="true"
            aria-label={t('next')}
            className="date-nav__arrow date-nav__arrow--disabled"
          >
            <span aria-hidden>{'›'}</span>
          </span>
        </Tip>
      )}
      {date !== today && (
        <Link href="/today" className="date-nav__today">
          {t('today')}
        </Link>
      )}
    </nav>
  );
};
