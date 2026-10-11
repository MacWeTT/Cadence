import { useTranslations } from 'next-intl';
import { habitColor } from '@/lib/palette';
import { streakLengthMsg, streakMsg } from '@/lib/today-labels';
import { useMsg } from '@/lib/use-msg';
import type { ProgressHabit } from '@/server/progress-view';
import { percentMsg } from '@/app/(app)/progress/progress-links';
import './rates-row.css';

interface RatesRowProps {
  habit: ProgressHabit;
}

/** One habit's current streak, best streak and completion rate. */
export const RatesRow = (props: RatesRowProps) => {
  const { habit } = props;

  const t = useTranslations('progress.rates');
  const tm = useMsg();

  const { icon, color, name, archived, current, longest, rate } = habit;

  return (
    <li className="rates-row">
      <span
        aria-hidden
        className="rates-row__icon"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(color)} 22%, var(--surface))` }}
      >
        {icon}
      </span>
      <p className="rates-row__name">
        {name}
        {archived && <span className="rates-row__archived">{t('archived')}</span>}
      </p>
      <p className="rates-row__streak">{current ? tm(streakMsg(current)) : t('noStreak')}</p>
      <p className="rates-row__best">
        {longest.count > 0 ? t('best', { length: tm(streakLengthMsg(longest)) }) : t('bestNone')}
      </p>
      <p className="rates-row__rate">{tm(percentMsg(rate))}</p>
    </li>
  );
};
