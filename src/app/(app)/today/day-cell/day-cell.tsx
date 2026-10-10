import Link from 'next/link';
import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DaySummary } from '@/server/today-view';
import './day-cell.css';

const cellState = (d: DaySummary) => {
  if (d.future || d.total === 0) {
    return 'quiet';
  }

  if (d.done === d.total) {
    return 'full';
  }

  return d.done > 0 ? 'partial' : 'empty';
};

const cellLabel = (d: DaySummary) => {
  return `${formatCalendarDate(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}: ${
    d.future ? 'not yet' : d.total === 0 ? 'nothing planned' : `${d.done} of ${d.total} done`
  }`;
};

interface DayCellProps {
  d: DaySummary;
  viewed: boolean;
  today: CalendarDate;
}

/** One day of the week strip: how many habits were done, linking to that day. */
export const DayCell = (props: DayCellProps) => {
  const { d, viewed, today } = props;

  const className = cn('day-cell', `day-cell--${cellState(d)}`, viewed && 'day-cell--viewed');

  if (d.future) {
    return <span role="img" aria-label={cellLabel(d)} className={className} />;
  }

  return (
    <Link
      href={d.date === today ? '/today' : `/today?date=${d.date}`}
      aria-label={cellLabel(d)}
      aria-current={viewed ? 'date' : undefined}
      className={className}
    >
      {d.total > 0 ? d.done : ''}
    </Link>
  );
};
