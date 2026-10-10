import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { formatCalendarDate } from '@/lib/format';
import { loadHabitData } from '@/server/habit-data';
import { buildProgress, parseRange } from '@/server/progress-view';
import { BarsCard } from './bars-card';
import { HabitFilter } from './habit-filter';
import { RatesCard } from './rates-card';
import { YearCard } from './year-card';
import './progress-content.css';

interface ProgressContentProps {
  searchParams: PageProps<'/progress'>['searchParams'];
}

/** Loads the data and lays out the Progress page: filter, year heatmap, rates and the weekly and monthly bars. */
export const ProgressContent = async (props: ProgressContentProps) => {
  const { searchParams } = props;

  const { habit, range: rangeParam } = await searchParams;
  const { entries, ctx } = await loadHabitData();

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nothing to show yet"
        text="Your history will build up here once you start ticking habits."
        action={
          <Button asChild>
            <Link href="/habits">Create a habit</Link>
          </Button>
        }
      />
    );
  }

  const view = buildProgress(entries, habit, parseRange(rangeParam), ctx);

  return (
    <div className="progress-content">
      <HabitFilter
        habits={entries.map(e => {
          return e.habit;
        })}
        selectedId={view.selectedId}
        range={view.range}
      />
      <YearCard view={view} />
      <RatesCard view={view} />
      <div className="progress-content__bars">
        <BarsCard
          title="Ticks per week"
          rows={view.weekly.map(w => {
            return {
              key: w.start,
              label: formatCalendarDate(w.start, { day: 'numeric', month: 'short' }),
              count: w.count,
            };
          })}
        />
        <BarsCard
          title="Ticks per month"
          rows={view.monthly.map(m => {
            return {
              key: m.month,
              label: formatCalendarDate(`${m.month}-01`, { month: 'short' }),
              count: m.count,
            };
          })}
        />
      </div>
    </div>
  );
};
