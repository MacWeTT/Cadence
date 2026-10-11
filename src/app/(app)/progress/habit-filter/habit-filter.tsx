import { useTranslations } from 'next-intl';
import type { HabitRow } from '@/server/habit-view';
import { ChipLink } from '@/app/(app)/progress/chip-link/chip-link';
import { progressHref } from '@/app/(app)/progress/progress-links';
import './habit-filter.css';

interface HabitFilterProps {
  habits: Pick<HabitRow, 'id' | 'icon' | 'name'>[];
  selectedId: string | null;
  range: number;
}

/** "All habits" and one chip per habit; the choice lives in the address. */
export const HabitFilter = (props: HabitFilterProps) => {
  const { habits, selectedId, range } = props;

  const t = useTranslations('progress.filter');

  return (
    <nav aria-label={t('label')} className="habit-filter">
      <ChipLink href={progressHref(null, range)} active={selectedId === null}>
        {t('all')}
      </ChipLink>
      {habits.map(({ id, icon, name }) => {
        return (
          <ChipLink key={id} href={progressHref(id, range)} active={selectedId === id}>
            <span aria-hidden>{icon}</span>
            {name}
          </ChipLink>
        );
      })}
    </nav>
  );
};
