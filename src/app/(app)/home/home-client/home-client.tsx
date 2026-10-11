'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import type { CalendarDate, WeekStart } from '@/domain/dates';
import { alertFor, clockIn } from '@/lib/alert';
import { useMsg } from '@/lib/use-msg';
import { whenVisible } from '@/lib/when-visible';
import { continuingStreaks, type HomeView } from '@/server/home-view';
import { HabitDialog } from '@/app/(app)/habits/habit-dialog/habit-dialog';
import { CheckSection } from '@/app/(app)/today/check-section/check-section';
import { useToggleCompletion } from '@/app/(app)/today/use-toggle-completion';
import { WeekStrip } from '@/app/(app)/today/week-strip/week-strip';
import { AlertBanner } from '@/app/(app)/home/alert-banner/alert-banner';
import { HomeHeader } from '@/app/(app)/home/home-header/home-header';
import { StreaksCard } from '@/app/(app)/home/streaks-card/streaks-card';
import { useGreeting } from '@/app/(app)/home/use-greeting';
import { useNow } from '@/app/(app)/home/use-now';
import './home-client.css';

interface HomeClientProps {
  home: HomeView;
  today: CalendarDate;
  name: string | null;
  timezone: string;
  weekStartsOn: WeekStart;
}

export const HomeClient = (props: HomeClientProps) => {
  const { home, today, name, timezone, weekStartsOn } = props;

  const [creating, setCreating] = useState(false);

  const router = useRouter();
  const t = useTranslations('home');
  const tc = useTranslations('common.emptyHabits');
  const tm = useMsg();
  const now = useNow();
  const { view: homeView, atRisk: atRiskRows } = home;
  const { shown, saving, toggle } = useToggleCompletion(homeView, today);
  const { hasHabits, todo: homeTodo } = homeView;
  const { todo, done: finished } = shown;

  const opener = useRef<HTMLElement | null>(null);
  const refreshedFor = useRef<string | null>(null);

  const clock = now && clockIn(timezone, now);
  const date = clock?.date;
  const todoCount = todo.length;
  const done = finished.length;
  const total = todoCount + done;

  const openIds = new Set(
    todo.map(row => {
      return row.id;
    }),
  );
  const atRisk = atRiskRows.filter(row => {
    return openIds.has(row.id);
  });

  const greeting = useGreeting(
    clock && {
      ...clock,
      name,
      allDone: total > 0 && done === total,
      noneDone: total > 0 && done === 0,
    },
  );

  const alert =
    clock &&
    alertFor({
      ...clock,
      total,
      open: todo.map(({ id, name }) => {
        return { id, name };
      }),
      atRisk: atRisk.map(({ id, name, streak: { count, unit } }) => {
        return { id, name, count, unit };
      }),
      continuing: continuingStreaks(
        finished,
        new Set(
          homeTodo.map(row => {
            return row.id;
          }),
        ),
      ),
    });

  // A tab left open past local midnight: the lists are yesterday's, so fetch today's once.
  useEffect(() => {
    if (!date || date === today || refreshedFor.current === date) {
      return;
    }

    return whenVisible(() => {
      refreshedFor.current = date;
      router.refresh();
    });
  }, [date, today, router]);

  const openDialog = () => {
    opener.current = document.activeElement as HTMLElement | null;
    setCreating(true);
  };

  const onHabitClose = () => {
    setCreating(false);
  };

  const onHabitCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    opener.current?.focus();
  };

  return (
    <>
      <HomeHeader
        done={done}
        total={total}
        today={today}
        greeting={greeting ? tm(greeting.message) : null}
        onNewHabit={openDialog}
      />
      {!hasHabits ? (
        <EmptyState
          title={tc('title')}
          text={tc('text')}
          action={<Button onClick={openDialog}>{tc('action')}</Button>}
        />
      ) : (
        <>
          <AlertBanner alert={alert} />
          <div className="home__columns">
            <div className="home__main">
              {total === 0 && <p className="home__note">{t('noneToday')}</p>}
              <CheckSection
                id="next-heading"
                title={t('nextUp', { count: todoCount })}
                rows={todo}
                saving={saving}
                onToggle={toggle}
                flush
              />
              <CheckSection
                id="done-heading"
                title={t('doneToday', { count: done })}
                rows={finished}
                saving={saving}
                onToggle={toggle}
                flush={todoCount === 0}
              />
            </div>
            <div className="home__side">
              <StreaksCard rows={atRisk} today={today} weekStartsOn={weekStartsOn} />
              <section className="home__week">
                <WeekStrip strip={shown.strip} date={today} today={today} />
              </section>
            </div>
          </div>
        </>
      )}

      {creating && (
        <HabitDialog
          today={today}
          weekStartsOn={weekStartsOn}
          onClose={onHabitClose}
          onCloseAutoFocus={onHabitCloseAutoFocus}
        />
      )}
    </>
  );
};
