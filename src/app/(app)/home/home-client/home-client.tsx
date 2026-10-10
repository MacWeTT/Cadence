'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/empty-state/empty-state';
import { Button } from '@/components/ui/button';
import type { CalendarDate, WeekStart } from '@/domain/dates';
import { alertFor, clockIn } from '@/lib/alert';
import { useMsg } from '@/lib/use-msg';
import { continuingStreaks, type HomeView } from '@/server/home-view';
import { HabitDialog } from '../../habits/habit-dialog/habit-dialog';
import { CheckSection } from '../../today/check-section/check-section';
import { useToggleCompletion } from '../../today/use-toggle-completion';
import { WeekStrip } from '../../today/week-strip/week-strip';
import { AlertBanner } from '../alert-banner/alert-banner';
import { HomeHeader } from '../home-header/home-header';
import { StreaksCard } from '../streaks-card/streaks-card';
import { useGreeting } from '../use-greeting';
import { useNow } from '../use-now';
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
  const { shown, saving, toggle } = useToggleCompletion(home.view, today);

  const opener = useRef<HTMLElement | null>(null);
  const refreshedFor = useRef<string | null>(null);

  const clock = now && clockIn(timezone, now);
  const total = shown.todo.length + shown.done.length;
  const done = shown.done.length;

  const openIds = new Set(
    shown.todo.map(r => {
      return r.id;
    }),
  );
  const atRisk = home.atRisk.filter(r => {
    return openIds.has(r.id);
  });

  const greeting = useGreeting(
    clock && {
      hour: clock.hour,
      weekday: clock.weekday,
      name,
      allDone: total > 0 && done === total,
      noneDone: total > 0 && done === 0,
    },
  );

  const alert =
    clock &&
    alertFor({
      hour: clock.hour,
      minutesToMidnight: clock.minutesToMidnight,
      total,
      open: shown.todo.map(r => {
        return { id: r.id, name: r.name };
      }),
      atRisk: atRisk.map(r => {
        return { id: r.id, name: r.name, count: r.streak.count, unit: r.streak.unit };
      }),
      continuing: continuingStreaks(
        shown.done,
        new Set(
          home.view.todo.map(r => {
            return r.id;
          }),
        ),
      ),
    });

  // A tab left open past local midnight: the lists are yesterday's, so fetch today's once.
  useEffect(() => {
    if (clock && clock.date !== today && refreshedFor.current !== clock.date) {
      refreshedFor.current = clock.date;
      router.refresh();
    }
  }, [clock, today, router]);

  const openDialog = () => {
    opener.current = document.activeElement as HTMLElement | null;
    setCreating(true);
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

      {!home.view.hasHabits ? (
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
                title={t('nextUp', { count: shown.todo.length })}
                rows={shown.todo}
                saving={saving}
                onToggle={toggle}
                flush
              />
              <CheckSection
                id="done-heading"
                title={t('doneToday', { count: done })}
                rows={shown.done}
                saving={saving}
                onToggle={toggle}
                flush={shown.todo.length === 0}
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
          onClose={() => {
            return setCreating(false);
          }}
          onCloseAutoFocus={e => {
            e.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
};
