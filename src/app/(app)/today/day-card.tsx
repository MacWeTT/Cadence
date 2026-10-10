import type { CalendarDate } from '@/domain/dates';
import type { DaySummary } from '@/server/today-view';
import { WeekStrip } from './week-strip';
import './day-card.css';

interface DayCardProps {
  done: number;
  total: number;
  strip: DaySummary[];
  date: CalendarDate;
  today: CalendarDate;
}

/** The margin card: how far through the viewed day you are, and the week at a glance. */
export const DayCard = (props: DayCardProps) => {
  const { done, total, strip, date, today } = props;

  return (
    <aside aria-label="Progress" className="day-card">
      <p className="day-card__count">
        {done} <span className="day-card__total">of {total}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Habits done"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="day-card__bar"
      >
        <div className="day-card__fill" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
      </div>
      <div className="day-card__week">
        <WeekStrip strip={strip} date={date} today={today} />
      </div>
    </aside>
  );
};
