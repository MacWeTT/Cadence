import { habitColor } from '@/lib/palette';
import { streakLabel, streakLength } from '@/lib/today-labels';
import type { ProgressHabit } from '@/server/progress-view';
import { percent } from './progress-links';
import './rates-row.css';

interface RatesRowProps {
  habit: ProgressHabit;
}

/** One habit's current streak, best streak and completion rate. */
export const RatesRow = (props: RatesRowProps) => {
  const { habit } = props;

  return (
    <li className="rates-row">
      <span
        aria-hidden
        className="rates-row__icon"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(habit.color)} 22%, var(--surface))` }}
      >
        {habit.icon}
      </span>
      <p className="rates-row__name">
        {habit.name}
        {habit.archived && <span className="rates-row__archived">archived</span>}
      </p>
      <p className="rates-row__streak">{habit.current ? streakLabel(habit.current) : 'No streak'}</p>
      <p className="rates-row__best">Best {habit.longest.count > 0 ? streakLength(habit.longest) : '—'}</p>
      <p className="rates-row__rate">{percent(habit.rate)}</p>
    </li>
  );
};
