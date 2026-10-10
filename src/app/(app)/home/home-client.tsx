'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CalendarDate, WeekStart } from '@/domain/dates';
import { alertFor, clockIn } from '@/lib/alert';
import { formatCalendarDate } from '@/lib/format';
import { continuingStreaks, type HomeView } from '@/server/home-view';
import { HabitDialog } from '../habits/habit-dialog';
import { CheckSection } from '../today/check-row';
import { WeekStrip } from '../today/day-card';
import { useToggleCompletion } from '../today/use-toggle-completion';
import { AlertBanner } from './alert-banner';
import { StreaksCard } from './streaks-card';
import { useGreeting } from './use-greeting';
import { useNow } from './use-now';

const card = 'rounded-2xl border border-line bg-surface p-5';

export function HomeClient({
  home,
  today,
  name,
  timezone,
  weekStartsOn,
}: {
  home: HomeView;
  today: CalendarDate;
  name: string | null;
  timezone: string;
  weekStartsOn: WeekStart;
}) {
  const router = useRouter();
  const { shown, saving, toggle } = useToggleCompletion(home.view, today);
  const [creating, setCreating] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const now = useNow();
  const clock = now && clockIn(timezone, now);
  const total = shown.todo.length + shown.done.length;
  const done = shown.done.length;

  const greeting = useGreeting(
    clock && {
      hour: clock.hour,
      weekday: clock.weekday,
      name,
      allDone: total > 0 && done === total,
      noneDone: total > 0 && done === 0,
    },
  );

  const openIds = new Set(shown.todo.map(r => r.id));
  const alert =
    clock &&
    alertFor({
      hour: clock.hour,
      minutesToMidnight: clock.minutesToMidnight,
      total,
      open: shown.todo.map(r => ({ id: r.id, name: r.name })),
      atRisk: home.atRisk
        .filter(r => openIds.has(r.id))
        .map(r => ({ id: r.id, name: r.name, count: r.streak.count, unit: r.streak.unit })),
      continuing: continuingStreaks(shown.done, new Set(home.view.todo.map(r => r.id))),
    });

  // A tab left open past local midnight: the lists are yesterday's, so fetch today's once.
  const refreshedFor = useRef<string | null>(null);
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
      <div className="flex items-center gap-5">
        <div
          role="img"
          aria-label={`${done} of ${total} done today`}
          className="flex size-22 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) ${total ? (done / total) * 360 : 0}deg, var(--line) 0)` }}
        >
          <span
            aria-hidden
            className="flex size-17 items-center justify-center rounded-full bg-bg font-display text-xl"
          >
            {done}/{total}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">
            {formatCalendarDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="min-h-[1.15em] break-words font-display text-4xl leading-tight">{greeting?.text ?? ' '}</h1>
        </div>
        <Button className="ml-auto shrink-0" onClick={openDialog}>
          New habit
        </Button>
      </div>

      {!home.view.hasHabits ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-2xl">No habits yet</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-ink-muted">
            Create a habit and it will show up here, ready to tick off.
          </p>
          <Button onClick={openDialog}>Create your first habit</Button>
        </div>
      ) : (
        <>
          <AlertBanner alert={alert} />
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
            <div className="min-w-0">
              {total === 0 && <p className="text-ink-muted">No habits today.</p>}
              <CheckSection
                id="next-heading"
                title={`Next up · ${shown.todo.length} left`}
                rows={shown.todo}
                saving={saving}
                onToggle={toggle}
                className="mt-0"
              />
              <CheckSection
                id="done-heading"
                title={`Done today · ${done}`}
                rows={shown.done}
                saving={saving}
                onToggle={toggle}
                className={shown.todo.length === 0 ? 'mt-0' : 'mt-8'}
              />
            </div>
            <div className="space-y-6">
              <StreaksCard
                rows={home.atRisk.filter(r => openIds.has(r.id))}
                today={today}
                weekStartsOn={weekStartsOn}
              />
              <section className={`${card} max-w-md lg:max-w-none`} aria-label="This week">
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
          onClose={() => setCreating(false)}
          onCloseAutoFocus={e => {
            e.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
}
