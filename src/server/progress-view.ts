// Pure maths behind the Progress page. Kept free of `server-only` so it can be unit-tested.
import { addDays, weekStart, type CalendarDate } from '@/domain/dates';
import { addRates, completionRate, type Rate } from '@/domain/rates';
import { scheduleFor } from '@/domain/schedule';
import { isPaused } from '@/domain/status';
import { currentStreak, longestStreak, type Streak } from '@/domain/streaks';
import type { Ctx, HabitData } from '@/domain/types';
import type { ColorKey } from '@/lib/palette';
import { toColorKey, type HabitRow } from './habit-view';

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  date: CalendarDate;
  /** `null` is a blank square: nothing was expected, or the day has not happened. */
  level: HeatLevel | null;
  done: number;
  expected: number;
}

const WEEKS_SHOWN = 53;

function heatCell(habits: HabitData[], single: boolean, day: CalendarDate, ctx: Ctx): HeatCell {
  const blank: HeatCell = { date: day, level: null, done: 0, expected: 0 };
  if (day > ctx.today) return blank;

  if (single) {
    const h = habits[0];
    if (h.completions.has(day)) return { date: day, level: 4, done: 1, expected: 1 };
    return h && day >= h.startDate && !isPaused(h, day) ? { date: day, level: 0, done: 0, expected: 1 } : blank;
  }

  let done = 0;
  let expected = 0;
  for (const h of habits) {
    if (h.completions.has(day)) done++; // a tick is always honoured
    const schedule = day >= h.startDate && !isPaused(h, day) ? scheduleFor(h, day) : undefined;
    if (schedule) expected += schedule.kind === 'weekly_count' ? schedule.timesPerWeek / 7 : 1;
  }
  if (done === 0 && expected === 0) return blank;
  const ratio = expected === 0 ? 1 : Math.min(1, done / expected);
  return { date: day, level: Math.ceil(ratio * 4) as HeatLevel, done, expected };
}

/**
 * The past year as week columns (oldest first), each with seven days from the week start. All habits: a day's shade is
 * done over expected, where a weekly habit expects N/7 a day. A single habit: ticked or not.
 */
export function heatmap(habits: HabitData[], single: boolean, ctx: Ctx): HeatCell[][] {
  const first = addDays(weekStart(ctx.today, ctx.weekStartsOn), -7 * (WEEKS_SHOWN - 1));
  return Array.from({ length: WEEKS_SHOWN }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => heatCell(habits, single, addDays(first, w * 7 + d), ctx)),
  );
}

export interface MonthBlock {
  /** `YYYY-MM` */
  month: string;
  /** Week columns of seven days from the week start; a day outside this month (or outside the year) is `null`, a spacer. */
  columns: (HeatCell | null)[][];
}

/** The heatmap regrouped by calendar month, like LeetCode's: each month is its own block of week columns. */
export function monthBlocks(weeks: HeatCell[][], ctx: Ctx): MonthBlock[] {
  const byDate = new Map(weeks.flat().map((c) => [c.date, c]));
  const blocks: MonthBlock[] = [];
  let year = Number(weeks[0][0].date.slice(0, 4));
  let month = Number(weeks[0][0].date.slice(5, 7));
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const monthLast = addDays(`${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`, -1);
    const columns: (HeatCell | null)[][] = [];
    for (let col = weekStart(`${key}-01`, ctx.weekStartsOn); col <= monthLast; col = addDays(col, 7)) {
      const days = Array.from({ length: 7 }, (_, d) => addDays(col, d)).map((day) => (day.startsWith(key) ? (byDate.get(day) ?? null) : null));
      if (days.some((c) => c !== null)) columns.push(days);
    }
    blocks.push({ month: key, columns });
    if (key === ctx.today.slice(0, 7)) return blocks;
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
}

/** Ticks and days with at least one tick across the heatmap. */
export function heatTotals(weeks: HeatCell[][]): { ticks: number; activeDays: number } {
  const cells = weeks.flat();
  return { ticks: cells.reduce((n, c) => n + c.done, 0), activeDays: cells.filter((c) => c.done > 0).length };
}

/** Done vs expected over the last `days` closed days (today is progress, not part of the rate). */
export function rangeRate(habits: HabitData[], days: number, ctx: Ctx): Rate {
  return addRates(habits.map((h) => completionRate(h, addDays(ctx.today, -days), addDays(ctx.today, -1), ctx)));
}

const allTicks = (habits: HabitData[]) => habits.flatMap((h) => [...h.completions]);

/** Ticks per week for the last `n` weeks, oldest first, ending with the current week. */
export function weeklyTicks(habits: HabitData[], n: number, ctx: Ctx): { start: CalendarDate; count: number }[] {
  const thisWeek = weekStart(ctx.today, ctx.weekStartsOn);
  const counts = new Map<CalendarDate, number>();
  for (const d of allTicks(habits)) counts.set(weekStart(d, ctx.weekStartsOn), (counts.get(weekStart(d, ctx.weekStartsOn)) ?? 0) + 1);
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(thisWeek, -7 * (n - 1 - i));
    return { start, count: counts.get(start) ?? 0 };
  });
}

/** Ticks per calendar month for the last `n` months, oldest first, ending with the current month. */
export function monthlyTicks(habits: HabitData[], n: number, ctx: Ctx): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of allTicks(habits)) counts.set(d.slice(0, 7), (counts.get(d.slice(0, 7)) ?? 0) + 1);
  const year = Number(ctx.today.slice(0, 4));
  const month = Number(ctx.today.slice(5, 7)) - 1;
  return Array.from({ length: n }, (_, i) => {
    const at = new Date(Date.UTC(year, month - (n - 1 - i), 1));
    const key = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
    return { month: key, count: counts.get(key) ?? 0 };
  });
}

export const RANGES = [7, 30, 90, 365] as const;
export type Range = (typeof RANGES)[number];

/** The rate window from the URL: one of the offered ranges, else 30 days. */
export function parseRange(value: string | string[] | undefined): Range {
  return RANGES.find((r) => String(r) === value) ?? 30;
}

export interface ProgressHabit {
  id: string;
  name: string;
  icon: string;
  color: ColorKey;
  archived: boolean;
  current: Streak | null;
  longest: Streak;
  rate: Rate;
}

export interface ProgressView {
  /** The habit filter in effect (`null` is all habits). */
  selectedId: string | null;
  range: Range;
  months: MonthBlock[];
  totals: { ticks: number; activeDays: number };
  habits: ProgressHabit[];
  rate: Rate;
  weekly: { start: CalendarDate; count: number }[];
  monthly: { month: string; count: number }[];
}

/** `habitParam` that names none of the habits means all of them. */
export function buildProgress(
  entries: { habit: HabitRow; data: HabitData }[],
  habitParam: string | string[] | undefined,
  range: Range,
  ctx: Ctx,
): ProgressView {
  const selected = entries.find((e) => e.habit.id === habitParam);
  const shown = selected ? [selected] : entries;
  const data = shown.map((e) => e.data);
  const weeks = heatmap(data, Boolean(selected), ctx);
  return {
    selectedId: selected?.habit.id ?? null,
    range,
    months: monthBlocks(weeks, ctx),
    totals: heatTotals(weeks),
    habits: shown.map(({ habit, data: h }) => {
      const current = currentStreak(h, ctx);
      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: toColorKey(habit.color),
        archived: h.pauses.some((p) => p.to === null),
        current: current.count > 0 ? current : null,
        longest: longestStreak(h, ctx),
        rate: rangeRate([h], range, ctx),
      };
    }),
    rate: rangeRate(data, range, ctx),
    weekly: weeklyTicks(data, 8, ctx),
    monthly: monthlyTicks(data, 6, ctx),
  };
}
