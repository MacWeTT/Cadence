import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import { formatCalendarDate } from '@/lib/format';
import { loadHabitData } from '@/server/habit-data';
import { buildProgress, parseRange } from '@/server/progress-view';
import { BarsCard } from '../bars-card/bars-card';
import { HabitFilter } from '../habit-filter/habit-filter';
import { RatesCard } from '../rates-card/rates-card';
import { YearCard } from '../year-card/year-card';
import './progress-content.css';

interface ProgressContentProps {
  searchParams: PageProps<'/progress'>['searchParams'];
}

/** Loads the data and lays out the Progress page: filter, year heatmap, rates and the weekly and monthly bars. */
export const ProgressContent = async (props: ProgressContentProps) => {
  const { searchParams } = props;

  const t = await getTranslations('progress');
  const { habit, range: rangeParam } = await searchParams;
  const { entries, ctx } = await loadHabitData();

  if (entries.length === 0) {
    return (
      <EmptyState
        title={t('emptyTitle')}
        text={t('emptyText')}
        action={
          <Button asChild>
            <Link href="/habits">{t('emptyAction')}</Link>
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
          title={t('bars.perWeek')}
          rows={view.weekly.map(w => {
            return {
              key: w.start,
              label: formatCalendarDate(w.start, { day: 'numeric', month: 'short' }),
              count: w.count,
            };
          })}
        />
        <BarsCard
          title={t('bars.perMonth')}
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
