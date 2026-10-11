import { addDays, weekStart, type CalendarDate } from '@/domain/dates';
import { isOffDay, scheduleFor } from '@/domain/schedule';
import { dayStatus, isPaused, weekStatus } from '@/domain/status';
import type { Ctx, HabitData } from '@/domain/types';

export interface Streak {
  unit: 'day' | 'week';
  count: number;
}

const unitNow = (h: HabitData, ctx: Ctx): Streak['unit'] => {
  return scheduleFor(h, ctx.today)?.kind === 'weekly_count' ? 'week' : 'day';
};

/**
 * The streak a habit is on now, in days (daily or fixed-weekday schedule) or weeks (weekly schedule). A pending today or an
 * in-progress week never breaks it, and it never reaches back past a schedule type change. Paused days and
 * weeks are neutral (skipped), and so are a fixed-weekday habit's other days. A habit that is archived right now has no current streak.
 */
export const currentStreak = (h: HabitData, ctx: Ctx): Streak => {
  const unit = unitNow(h, ctx);
  const { today, weekStartsOn } = ctx;
  const { startDate, pauses } = h;

  if (
    pauses.some(({ to }) => {
      return to === null;
    }) ||
    !scheduleFor(h, today)
  ) {
    return { unit, count: 0 };
  }

  let count = 0;

  if (unit === 'day') {
    let d: CalendarDate = dayStatus(h, today, ctx) === 'done' ? today : addDays(today, -1);

    for (; d >= startDate; d = addDays(d, -1)) {
      if (dayStatus(h, d, ctx) === 'done') {
        count++;
      } else if (!isPaused(h, d) && !isOffDay(h, d)) {
        break;
      }
    }
  } else {
    const thisWeek = weekStart(today, weekStartsOn);
    let w: CalendarDate = weekStatus(h, thisWeek, ctx).status === 'met' ? thisWeek : addDays(thisWeek, -7);

    for (; addDays(w, 6) >= startDate; w = addDays(w, -7)) {
      const { status } = weekStatus(h, w, ctx);

      if (status === 'met') {
        count++;
      } else if (status !== 'paused') {
        break;
      }
    }
  }

  return { unit, count };
};

/** The longest run of done days or met weeks anywhere in the history; on equal counts the most recent run wins. */
export const longestStreak = (h: HabitData, ctx: Ctx): Streak => {
  const { today, weekStartsOn } = ctx;
  const { startDate } = h;
  let best = { unit: unitNow(h, ctx), count: 0, end: startDate };

  const consider = (unit: Streak['unit'], count: number, end: CalendarDate) => {
    const { count: bestCount, end: bestEnd } = best;

    if (count > bestCount || (count === bestCount && end > bestEnd)) {
      best = { unit, count, end };
    }
  };

  let run = 0;

  for (let d = startDate; d <= today; d = addDays(d, 1)) {
    if (dayStatus(h, d, ctx) === 'done') {
      consider('day', ++run, d);
    } else if (!isPaused(h, d) && !isOffDay(h, d)) {
      run = 0;
    }
  }

  run = 0;

  for (let w = weekStart(startDate, weekStartsOn); w <= today; w = addDays(w, 7)) {
    const { status } = weekStatus(h, w, ctx);

    if (status === 'met') {
      consider('week', ++run, w);
    } else if (status !== 'in_progress' && status !== 'paused') {
      run = 0;
    }
  }

  const { unit, count } = best;

  return { unit, count };
};
