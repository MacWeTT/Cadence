'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import { addDays } from '@/domain/dates';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/keys';
import type { TodayData } from '@/server/today';
import type { TodayRow } from '@/server/today-view';
import { formatCalendarDate } from '@/lib/format';
import { CheckSection } from '@/app/(app)/today/check-section/check-section';
import { DateNav } from '@/app/(app)/today/date-nav/date-nav';
import { DayCard } from '@/app/(app)/today/day-card/day-card';
import { useCachedToggle } from '@/app/(app)/today/use-cached-toggle';
import { useTodayData } from '@/app/(app)/today/use-today';
import './today-client.css';

/** The Today page: the day in the URL (`?date=`), read from the browser's cache at once when it is there. */
export const TodayClient = () => {
  const dateParam = useSearchParams().get('date') ?? undefined;

  const t = useTranslations('today');
  const tc = useTranslations('common.emptyHabits');
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useTodayData(dateParam);
  const { saving, toggle } = useCachedToggle(data?.view);

  const day = data?.date;
  const first = data?.earliest;
  const todayDate = data?.today;

  // Fetch the days either side while this one is read, so the arrows open the next day at once.
  useEffect(() => {
    if (!day || !first || !todayDate) {
      return;
    }

    [addDays(day, -1), addDays(day, 1)]
      .filter(neighbour => {
        return neighbour >= first && neighbour <= todayDate;
      })
      .forEach(neighbour => {
        void queryClient.prefetchQuery({
          queryKey: queryKeys.today(neighbour === todayDate ? undefined : neighbour),
          queryFn: () => {
            return fetchJson<TodayData>(neighbour === todayDate ? '/api/today' : `/api/today?date=${neighbour}`);
          },
        });
      });
  }, [day, first, todayDate, queryClient]);

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
      <ListSkeleton title={t('title')} />
    );
  }

  const { view, date, today, earliest } = data;
  const { todo, done: finished, optional, strip } = view;

  const onToggle = (row: TodayRow) => {
    toggle(row, date);
  };

  const isToday = date === today;
  const todoCount = todo.length;
  const doneCount = finished.length;
  const nothingListed = todoCount === 0 && doneCount === 0 && optional.length === 0;

  return (
    <>
      <div className="today__header">
        <div>
          {isToday && (
            <p className="today__date">
              {formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
          <h1 className="today__title">
            {isToday ? t('title') : formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}
          </h1>
        </div>
        <DateNav date={date} today={today} earliest={earliest} />
      </div>
      {!view.hasHabits ? (
        <EmptyState
          title={tc('title')}
          text={tc('text')}
          action={
            <Button asChild>
              <Link href="/habits">{tc('action')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="today__columns">
          <div className="today__main">
            {nothingListed ? (
              <p className="today__note">{t('noneThisDay')}</p>
            ) : (
              <>
                {todoCount === 0 && (
                  <p className="today__note">{isToday ? t('nothingLeftToday') : t('nothingLeftThisDay')}</p>
                )}
                <CheckSection
                  id="todo-heading"
                  title={t('todo')}
                  rows={todo}
                  saving={saving}
                  onToggle={onToggle}
                  canFocus={isToday}
                />
                <CheckSection
                  id="done-heading"
                  title={isToday ? t('doneToday') : t('done')}
                  rows={finished}
                  saving={saving}
                  onToggle={onToggle}
                  canFocus={isToday}
                />
                <CheckSection
                  id="optional-heading"
                  title={t('whenever')}
                  rows={optional}
                  saving={saving}
                  onToggle={onToggle}
                  canFocus={isToday}
                />
              </>
            )}
          </div>
          <div className="today__side">
            <DayCard done={doneCount} total={doneCount + todoCount} strip={strip} date={date} today={today} />
          </div>
        </div>
      )}
    </>
  );
};
