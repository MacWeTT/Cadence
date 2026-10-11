import { addDays, weekStart, type CalendarDate } from '@/domain/dates';
import { dayStatus, weekStatus } from '@/domain/status';
import type { Ctx, HabitData } from '@/domain/types';

export interface Rate {
  done: number;
  expected: number;
}

/**
 * Completed vs expected over `[from, to]`, counting closed periods only (today and the current week show as
 * progress, not as part of the rate). Missed periods stay in `expected`. Weekly habits count whole weeks that
 * lie fully inside the window, with ticks capped at the weekly target.
 */
export const completionRate = (h: HabitData, from: CalendarDate, to: CalendarDate, ctx: Ctx): Rate => {
  const rate: Rate = { done: 0, expected: 0 };
  const { today, weekStartsOn } = ctx;

  const lastDay = to < today ? to : addDays(today, -1);

  for (let d = from; d <= lastDay; d = addDays(d, 1)) {
    const status = dayStatus(h, d, ctx);

    if (status === 'done') {
      rate.done++;
    }

    if (status === 'done' || status === 'missed') {
      rate.expected++;
    }
  }

  let w = weekStart(from, weekStartsOn);

  if (w < from) {
    w = addDays(w, 7);
  }

  for (; addDays(w, 6) <= to && addDays(w, 6) < today; w = addDays(w, 7)) {
    const { status: weekState, done, target } = weekStatus(h, w, ctx);

    if (weekState !== 'met' && weekState !== 'missed') {
      continue;
    }

    rate.done += Math.min(done, target);
    rate.expected += target;
  }

  return rate;
};

export const addRates = (rates: Rate[]): Rate => {
  return rates.reduce(
    ({ done: doneSoFar, expected: expectedSoFar }, { done, expected }) => {
      return { done: doneSoFar + done, expected: expectedSoFar + expected };
    },
    {
      done: 0,
      expected: 0,
    },
  );
};

/** done ÷ expected, or null when nothing was expected (never 0%). */
export const ratio = ({ done, expected }: Rate): number | null => {
  return expected === 0 ? null : done / expected;
};
