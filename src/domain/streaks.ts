import { addDays, weekStart, type CalendarDate } from './dates';
import { scheduleFor } from './schedule';
import { dayStatus, isPaused, weekStatus } from './status';
import type { Ctx, HabitData } from './types';

export interface Streak {
  unit: 'day' | 'week';
  count: number;
}

const unitNow = (h: HabitData, ctx: Ctx): Streak['unit'] =>
  scheduleFor(h, ctx.today)?.kind === 'weekly_count' ? 'week' : 'day';

/**
 * The streak a habit is on now, in days (daily schedule) or weeks (weekly schedule). A pending today or an
 * in-progress week never breaks it, and it never reaches back past a schedule type change. Paused days and
 * weeks are neutral (skipped). A habit that is archived right now has no current streak.
 */
export function currentStreak(h: HabitData, ctx: Ctx): Streak {
  const unit = unitNow(h, ctx);
  if (h.pauses.some(p => p.to === null) || !scheduleFor(h, ctx.today)) return { unit, count: 0 };

  let count = 0;
  if (unit === 'day') {
    let d: CalendarDate = dayStatus(h, ctx.today, ctx) === 'done' ? ctx.today : addDays(ctx.today, -1);
    for (; d >= h.startDate; d = addDays(d, -1)) {
      if (dayStatus(h, d, ctx) === 'done') count++;
      else if (!isPaused(h, d)) break;
    }
  } else {
    const thisWeek = weekStart(ctx.today, ctx.weekStartsOn);
    let w: CalendarDate = weekStatus(h, thisWeek, ctx).status === 'met' ? thisWeek : addDays(thisWeek, -7);
    for (; addDays(w, 6) >= h.startDate; w = addDays(w, -7)) {
      const { status } = weekStatus(h, w, ctx);
      if (status === 'met') count++;
      else if (status !== 'paused') break;
    }
  }
  return { unit, count };
}

/** The longest run of done days or met weeks anywhere in the history; on equal counts the most recent run wins. */
export function longestStreak(h: HabitData, ctx: Ctx): Streak {
  let best = { unit: unitNow(h, ctx), count: 0, end: h.startDate };
  const consider = (unit: Streak['unit'], count: number, end: CalendarDate) => {
    if (count > best.count || (count === best.count && end > best.end)) best = { unit, count, end };
  };

  let run = 0;
  for (let d = h.startDate; d <= ctx.today; d = addDays(d, 1)) {
    if (dayStatus(h, d, ctx) === 'done') consider('day', ++run, d);
    else if (!isPaused(h, d)) run = 0;
  }

  run = 0;
  for (let w = weekStart(h.startDate, ctx.weekStartsOn); w <= ctx.today; w = addDays(w, 7)) {
    const { status } = weekStatus(h, w, ctx);
    if (status === 'met') consider('week', ++run, w);
    else if (status !== 'in_progress' && status !== 'paused') run = 0;
  }
  return { unit: best.unit, count: best.count };
}
