'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import type { TodayView } from '@/server/today-view';
import { CheckSection } from '@/app/(app)/today/check-section/check-section';
import { DateNav } from '@/app/(app)/today/date-nav/date-nav';
import { DayCard } from '@/app/(app)/today/day-card/day-card';
import { useToggleCompletion } from '@/app/(app)/today/use-toggle-completion';
import './today-client.css';

interface TodayClientProps {
  view: TodayView;
  date: CalendarDate;
  today: CalendarDate;
  earliest: CalendarDate;
}

export const TodayClient = (props: TodayClientProps) => {
  const { view, date, today, earliest } = props;

  const t = useTranslations('today');
  const tc = useTranslations('common.emptyHabits');
  const { shown, saving, toggle } = useToggleCompletion(view, date);
  const { todo, done: finished, strip } = shown;

  const isToday = date === today;
  const todoCount = todo.length;
  const doneCount = finished.length;
  const nothingListed = todoCount === 0 && doneCount === 0;

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
                <CheckSection id="todo-heading" title={t('todo')} rows={todo} saving={saving} onToggle={toggle} />
                <CheckSection
                  id="done-heading"
                  title={isToday ? t('doneToday') : t('done')}
                  rows={finished}
                  saving={saving}
                  onToggle={toggle}
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
