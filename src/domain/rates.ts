import { addDays, weekStart, type CalendarDate } from './dates';
import { dayStatus, weekStatus } from './status';
import type { Ctx, HabitData } from './types';

export interface Rate {
  done: number;
  expected: number;
}

/**
 * Completed vs expected over `[from, to]`, counting closed periods only (today and the current week show as
 * progress, not as part of the rate). Missed periods stay in `expected`. Weekly habits count whole weeks that
 * lie fully inside the window, with ticks capped at the weekly target.
 */
export function completionRate(h: HabitData, from: CalendarDate, to: CalendarDate, ctx: Ctx): Rate {
  const rate: Rate = { done: 0, expected: 0 };

  const lastDay = to < ctx.today ? to : addDays(ctx.today, -1);
  for (let d = from; d <= lastDay; d = addDays(d, 1)) {
    const status = dayStatus(h, d, ctx);
    if (status === 'done') rate.done++;
    if (status === 'done' || status === 'missed') rate.expected++;
  }

  let w = weekStart(from, ctx.weekStartsOn);
  if (w < from) w = addDays(w, 7);
  for (; addDays(w, 6) <= to && addDays(w, 6) < ctx.today; w = addDays(w, 7)) {
    const week = weekStatus(h, w, ctx);
    if (week.status !== 'met' && week.status !== 'missed') continue;
    rate.done += Math.min(week.done, week.target);
    rate.expected += week.target;
  }
  return rate;
}

export function addRates(rates: Rate[]): Rate {
  return rates.reduce((a, r) => ({ done: a.done + r.done, expected: a.expected + r.expected }), { done: 0, expected: 0 });
}

/** done ÷ expected, or null when nothing was expected (never 0%). */
export function ratio(r: Rate): number | null {
  return r.expected === 0 ? null : r.done / r.expected;
}
