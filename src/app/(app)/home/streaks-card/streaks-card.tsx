import type { WeekStart } from '@/domain/dates';
import { weekEnd, type CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import { habitColor } from '@/lib/palette';
import { streakLength } from '@/lib/today-labels';
import type { AtRiskRow } from '@/server/home-view';
import './streaks-card.css';

const tag = (row: AtRiskRow, today: CalendarDate, weekStartsOn: WeekStart) => {
  if (row.needed === null) {
    return `${streakLength(row.streak)} · ends at midnight`;
  }

  const last = formatCalendarDate(weekEnd(today, weekStartsOn), { weekday: 'long' });

  return `${streakLength(row.streak)} · ${row.needed} more by ${last}`;
};

interface StreaksCardProps {
  rows: AtRiskRow[];
  today: CalendarDate;
  weekStartsOn: WeekStart;
}

/** Streaks that will break if nothing more is ticked in time. */
export const StreaksCard = (props: StreaksCardProps) => {
  const { rows, today, weekStartsOn } = props;

  return (
    <section aria-labelledby="streaks-heading" className="streaks-card">
      <h2 id="streaks-heading" className="streaks-card__title">
        Streaks to protect
      </h2>
      {rows.length === 0 ? (
        <p className="streaks-card__empty">No streaks at risk right now.</p>
      ) : (
        <ul className="streaks-card__list">
          {rows.map(row => {
            return (
              <li key={row.id} className="streaks-card__item">
                <span
                  aria-hidden
                  className="streaks-card__icon"
                  style={{ backgroundColor: `color-mix(in oklab, ${habitColor(row.color)} 22%, var(--surface))` }}
                >
                  {row.icon}
                </span>
                <div className="streaks-card__body">
                  <p className="streaks-card__name">{row.name}</p>
                  <p className="streaks-card__tag">{tag(row, today, weekStartsOn)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
