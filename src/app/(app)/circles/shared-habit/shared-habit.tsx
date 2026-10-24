import { useTranslations } from 'next-intl';
import { HistoryStrip } from '@/app/(app)/circles/history-strip/history-strip';
import type { CalendarDate } from '@/domain/dates';
import type { SharedHabitView } from '@/server/circles-view';
import './shared-habit.css';

interface SharedHabitProps {
  habit: SharedHabitView;
  /** The owner's today, for the history. */
  today: CalendarDate;
}

/** One habit a friend shares, with only what its level allows: done today, streak, the week's count, the history. */
export const SharedHabit = (props: SharedHabitProps) => {
  const { habit, today } = props;
  const { name, icon, done, streak, week, ticks } = habit;

  const t = useTranslations('circles.member');

  const { unit, count } = streak ?? { unit: 'day', count: 0 };
  const { done: weekDone, target } = week ?? { done: 0, target: 0 };
  const shown = name ?? (icon ? '' : t('aHabit'));

  return (
    <li className="shared-habit">
      <div className="shared-habit__line">
        {icon && <span aria-hidden="true">{icon}</span>}
        {shown && <span className="shared-habit__name">{shown}</span>}
        {done && <span className="shared-habit__badge">{t('doneToday')}</span>}
        {streak && (
          <span className="shared-habit__meta">
            {unit === 'week' ? t('streakWeeks', { count }) : t('streakDays', { count })}
          </span>
        )}
        {week && <span className="shared-habit__meta">{t('weekProgress', { done: weekDone, target })}</span>}
      </div>
      {ticks && <HistoryStrip ticks={ticks} today={today} />}
    </li>
  );
};
