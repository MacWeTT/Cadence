import { useTranslations } from 'next-intl';
import { habitColor } from '@/lib/palette';
import type { ProgressData } from '@/server/progress';
import { ProgressCard } from '@/app/(app)/progress/progress-card/progress-card';
import './focus-card.css';

interface FocusCardProps {
  focus: ProgressData['focus'];
  habits: ProgressData['habits'];
}

/** Focus time: the total and minutes per habit, over the page's period and habit filter. */
export const FocusCard = (props: FocusCardProps) => {
  const { focus, habits } = props;
  const { totalSeconds, byHabit } = focus;

  const t = useTranslations('progress.focus');

  return (
    <ProgressCard labelledBy="focus-heading">
      <h2 id="focus-heading" className="focus-card__title">
        {t('title')}
      </h2>
      {totalSeconds === 0 ? (
        <p className="focus-card__empty">{t('empty')}</p>
      ) : (
        <>
          <p className="focus-card__total">{t('total', { minutes: Math.floor(totalSeconds / 60) })}</p>
          <ul className="focus-card__list">
            {byHabit.map(({ habitId, seconds }) => {
              const habit = habits.find(({ id }) => {
                return id === habitId;
              });

              return (
                <li key={habitId} className="focus-card__item">
                  <span aria-hidden>{habit?.icon}</span>
                  <span className="focus-card__name">{habit?.name}</span>
                  <span className="focus-card__minutes">{t('habit', { minutes: Math.floor(seconds / 60) })}</span>
                  <span
                    aria-hidden
                    className="focus-card__bar"
                    style={{ width: `${(seconds / totalSeconds) * 100}%`, backgroundColor: habitColor('moss') }}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </ProgressCard>
  );
};
