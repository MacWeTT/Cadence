import { useTranslations } from 'next-intl';
import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { DaySummary } from '@/server/today-view';
import { DayCell } from '@/app/(app)/today/day-cell/day-cell';
import './week-strip.css';

interface WeekStripProps {
  strip: DaySummary[];
  date: CalendarDate;
  today: CalendarDate;
}

/** The seven days of a week as small cells; each links to that day on Today. */
export const WeekStrip = (props: WeekStripProps) => {
  const { strip, date, today } = props;

  const t = useTranslations('today.card');

  return (
    <>
      <h2 className="week-strip__title">{t('thisWeek')}</h2>
      <ul className="week-strip__days">
        {strip.map(d => {
          const { date: dayDate } = d;

          return (
            <li key={dayDate} className="week-strip__day">
              <span aria-hidden className="week-strip__initial">
                {formatCalendarDate(dayDate, { weekday: 'narrow' })}
              </span>
              <DayCell d={d} viewed={dayDate === date} today={today} />
            </li>
          );
        })}
      </ul>
    </>
  );
};
