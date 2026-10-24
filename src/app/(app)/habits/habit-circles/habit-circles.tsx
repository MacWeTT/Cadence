'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCircles } from '@/app/(app)/circles/use-circles';
import { HabitCircleRow } from '@/app/(app)/habits/habit-circle-row/habit-circle-row';
import './habit-circles.css';

interface HabitCirclesProps {
  habit: { id: string };
}

/**
 * "Share with circles" in the habit dialog: each circle you are in, and how much of this habit it sees. It saves as you
 * choose, apart from the dialog's own Save. The desktop app has no Circles, and swaps this for an empty version.
 */
export const HabitCircles = (props: HabitCirclesProps) => {
  const { habit } = props;
  const { id: habitId } = habit;

  const t = useTranslations('habits.dialog.circles');
  const { data: circles } = useCircles();

  if (!circles) {
    return null;
  }

  return (
    <fieldset className="habit-circles">
      <legend className="habit-circles__title">{t('title')}</legend>
      {circles.length === 0 ? (
        <p className="habit-circles__text">
          {t('empty')}{' '}
          <Link href="/circles" className="habit-circles__link">
            {t('open')}
          </Link>
        </p>
      ) : (
        <>
          <p className="habit-circles__text">{t('text')}</p>
          <ul>
            {circles.map(circle => {
              return <HabitCircleRow key={circle.id} habitId={habitId} circle={circle} />;
            })}
          </ul>
        </>
      )}
    </fieldset>
  );
};
