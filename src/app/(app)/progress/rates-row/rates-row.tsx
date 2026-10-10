import { useTranslations } from 'next-intl';
import { habitColor } from '@/lib/palette';
import { streakLengthMsg, streakMsg } from '@/lib/today-labels';
import { useMsg } from '@/lib/use-msg';
import type { ProgressHabit } from '@/server/progress-view';
import { percentMsg } from '../progress-links';
import './rates-row.css';

interface RatesRowProps {
  habit: ProgressHabit;
}

/** One habit's current streak, best streak and completion rate. */
export const RatesRow = (props: RatesRowProps) => {
  const { habit } = props;

  const t = useTranslations('progress.rates');
  const tm = useMsg();

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
        {habit.archived && <span className="rates-row__archived">{t('archived')}</span>}
      </p>
      <p className="rates-row__streak">{habit.current ? tm(streakMsg(habit.current)) : t('noStreak')}</p>
      <p className="rates-row__best">
        {habit.longest.count > 0 ? t('best', { length: tm(streakLengthMsg(habit.longest)) }) : t('bestNone')}
      </p>
      <p className="rates-row__rate">{tm(percentMsg(habit.rate))}</p>
    </li>
  );
};
