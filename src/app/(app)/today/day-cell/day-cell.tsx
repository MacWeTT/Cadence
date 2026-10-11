import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DaySummary } from '@/server/today-view';
import './day-cell.css';

const cellState = (d: DaySummary) => {
  const { future, total, done } = d;

  if (future || total === 0) {
    return 'quiet';
  }

  if (done === total) {
    return 'full';
  }

  return done > 0 ? 'partial' : 'empty';
};

interface DayCellProps {
  d: DaySummary;
  viewed: boolean;
  today: CalendarDate;
}

/** One day of the week strip: how many habits were done, linking to that day. */
export const DayCell = (props: DayCellProps) => {
  const { d, viewed, today } = props;

  const t = useTranslations('today.cell');

  const { date, future, total, done } = d;

  const className = cn('day-cell', `day-cell--${cellState(d)}`, viewed && 'day-cell--viewed');
  const day = formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'short' });
  const label = future
    ? t('notYet', { day })
    : total === 0
      ? t('nothingPlanned', { day })
      : t('done', { day, done: done, total: total });

  if (future) {
    return <span role="img" aria-label={label} className={className} />;
  }

  return (
    <Link
      href={date === today ? '/today' : `/today?date=${date}`}
      aria-label={label}
      aria-current={viewed ? 'date' : undefined}
      className={className}
    >
      {total > 0 ? done : ''}
    </Link>
  );
};
