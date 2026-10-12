'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ProgressSkeleton } from '@/components/progress-skeleton/progress-skeleton';
import { Button } from '@/components/ui/button';
import { formatCalendarDate } from '@/lib/format';
import { parseRange } from '@/server/progress-view';
import { BarsCard } from '@/app/(app)/progress/bars-card/bars-card';
import { FocusCard } from '@/app/(app)/progress/focus-card/focus-card';
import { HabitFilter } from '@/app/(app)/progress/habit-filter/habit-filter';
import { RatesCard } from '@/app/(app)/progress/rates-card/rates-card';
import { useProgressData } from '@/app/(app)/progress/use-progress';
import { YearCard } from '@/app/(app)/progress/year-card/year-card';
import './progress-content.css';

/** The Progress page: filter (kept in the address), year heatmap, rates and the weekly and monthly bars. */
export const ProgressContent = () => {
  const params = useSearchParams();
  const habitParam = params.get('habit');
  const range = parseRange(params.get('range') ?? undefined);

  const t = useTranslations('progress');
  const { data, isError, refetch } = useProgressData(habitParam, range);

  const onRetry = () => {
    void refetch();
  };

  if (!data) {
    return isError ? (
      <EmptyState
        title={t('loadFailedTitle')}
        text={t('loadFailedText')}
        action={<Button onClick={onRetry}>{t('retry')}</Button>}
      />
    ) : (
      <ProgressSkeleton />
    );
  }

  const { view, habits, focus } = data;

  if (!view) {
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

  const { weekly, monthly } = view;

  // The chips follow the address, not the data on screen, so a tap lights up before its numbers arrive.
  const selectedId =
    habits.find(({ id }) => {
      return id === habitParam;
    })?.id ?? null;

  return (
    <div className="progress-content">
      <HabitFilter habits={habits} selectedId={selectedId} range={range} />
      <YearCard view={view} />
      <RatesCard view={view} />
      <FocusCard focus={focus} habits={habits} />
      <div className="progress-content__bars">
        <BarsCard
          title={t('bars.perWeek')}
          rows={weekly.map(({ start, count }) => {
            return {
              key: start,
              label: formatCalendarDate(start, { day: 'numeric', month: 'short' }),
              count,
            };
          })}
        />
        <BarsCard
          title={t('bars.perMonth')}
          rows={monthly.map(({ month, count }) => {
            return {
              key: month,
              label: formatCalendarDate(`${month}-01`, { month: 'short' }),
              count,
            };
          })}
        />
      </div>
    </div>
  );
};
