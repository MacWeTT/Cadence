import type { HabitRow } from '@/server/habit-view';
import { ChipLink } from '../chip-link/chip-link';
import { progressHref } from '../progress-links';
import './habit-filter.css';

interface HabitFilterProps {
  habits: Pick<HabitRow, 'id' | 'icon' | 'name'>[];
  selectedId: string | null;
  range: number;
}

/** "All habits" and one chip per habit; the choice lives in the address. */
export const HabitFilter = (props: HabitFilterProps) => {
  const { habits, selectedId, range } = props;

  return (
    <nav aria-label="Filter by habit" className="habit-filter">
      <ChipLink href={progressHref(null, range)} active={selectedId === null}>
        All habits
      </ChipLink>
      {habits.map(h => {
        return (
          <ChipLink key={h.id} href={progressHref(h.id, range)} active={selectedId === h.id}>
            <span aria-hidden>{h.icon}</span>
            {h.name}
          </ChipLink>
        );
      })}
    </nav>
  );
};
