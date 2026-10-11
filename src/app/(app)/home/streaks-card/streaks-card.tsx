import { useTranslations } from 'next-intl';
import type { WeekStart } from '@/domain/dates';
import { weekEnd, type CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import { msg, type Msg } from '@/lib/message';
import { habitColor } from '@/lib/palette';
import { streakLengthMsg } from '@/lib/today-labels';
import { useMsg } from '@/lib/use-msg';
import type { AtRiskRow } from '@/server/home-view';
import './streaks-card.css';

const tagMsg = (row: AtRiskRow, today: CalendarDate, weekStartsOn: WeekStart): Msg => {
  const { streak, needed } = row;
  const length = streakLengthMsg(streak);

  if (needed === null) {
    return msg('home.streaks.endsAtMidnight', { length });
  }

  const day = formatCalendarDate(weekEnd(today, weekStartsOn), { weekday: 'long' });

  return msg('home.streaks.moreBy', { length, needed, day });
};

interface StreaksCardProps {
  rows: AtRiskRow[];
  today: CalendarDate;
  weekStartsOn: WeekStart;
}

/** Streaks that will break if nothing more is ticked in time. */
export const StreaksCard = (props: StreaksCardProps) => {
  const { rows, today, weekStartsOn } = props;

  const t = useTranslations('home.streaks');
  const tm = useMsg();

  return (
    <section aria-labelledby="streaks-heading" className="streaks-card">
      <h2 id="streaks-heading" className="streaks-card__title">
        {t('title')}
      </h2>
      {rows.length === 0 ? (
        <p className="streaks-card__empty">{t('none')}</p>
      ) : (
        <ul className="streaks-card__list">
          {rows.map(row => {
            const { id, color, icon, name } = row;

            return (
              <li key={id} className="streaks-card__item">
                <span
                  aria-hidden
                  className="streaks-card__icon"
                  style={{ backgroundColor: `color-mix(in oklab, ${habitColor(color)} 22%, var(--surface))` }}
                >
                  {icon}
                </span>
                <div className="streaks-card__body">
                  <p className="streaks-card__name">{name}</p>
                  <p className="streaks-card__tag">{tm(tagMsg(row, today, weekStartsOn))}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
