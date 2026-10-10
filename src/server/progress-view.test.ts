import { describe, expect, it } from 'vitest';
import { ctx, makeHabit } from '@/domain/test-helpers';
import type { Schedule } from '@/domain/types';
import type { HabitRow } from './habit-view';
import { buildProgress, heatmap, heatTotals, monthBlocks, monthlyTicks, parseRange, rangeRate, weeklyTicks } from './progress-view';

const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => ({ kind: 'weekly_count', timesPerWeek, effectiveFrom });
const TODAY = '2026-10-09'; // a Friday
const cell = (weeks: ReturnType<typeof heatmap>, date: string) => weeks.flat().find((c) => c.date === date)!;

describe('heatmap layout', () => {
  it('is 53 weeks of 7 days, starting on the week start, ending in the week that holds today', () => {
    const weeks = heatmap([makeHabit()], false, ctx(TODAY));
    expect(weeks).toHaveLength(53);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[52][0].date).toBe('2026-10-05');
    expect(weeks[52][6].date).toBe('2026-10-11');
    expect(weeks[0][0].date).toBe('2025-10-06');
    expect(heatmap([], false, ctx(TODAY, 7))[52][0].date).toBe('2026-10-04');
  });
});

describe('heatmap, all habits', () => {
  const habits = [makeHabit({ done: ['2026-10-06', '2026-10-07'] }), makeHabit({ done: ['2026-10-07'] })];
  const weeks = heatmap(habits, false, ctx(TODAY));

  it('scales a day by habits done over habits expected, in five levels', () => {
    expect(cell(weeks, '2026-10-06').level).toBe(2); // 1 of 2
    expect(cell(weeks, '2026-10-07').level).toBe(4); // 2 of 2
    expect(cell(weeks, '2026-10-08').level).toBe(0); // 0 of 2
    expect(cell(weeks, '2026-10-07')).toMatchObject({ done: 2, expected: 2 });
  });
  it('leaves future days and days nothing was active blank', () => {
    expect(cell(weeks, '2026-10-10').level).toBeNull();
    expect(cell(weeks, '2026-09-30').level).toBeNull(); // before the habits started
  });
  it('expects a weekly habit at N/7 a day, so one tick is a full day', () => {
    const w = heatmap([makeHabit({ schedules: [weekly(3, '2026-10-01')], done: ['2026-10-06'] })], false, ctx(TODAY));
    expect(cell(w, '2026-10-06').level).toBe(4);
    expect(cell(w, '2026-10-07').level).toBe(0);
  });
});

describe('heatmap, single habit', () => {
  const habit = makeHabit({ startDate: '2026-10-03', done: ['2026-10-05'], pauses: [{ from: '2026-10-06', to: '2026-10-07' }] });
  const weeks = heatmap([habit], true, ctx(TODAY));
  it('is ticked or not, and blank before the start, in a pause, or in the future', () => {
    expect(cell(weeks, '2026-10-05').level).toBe(4);
    expect(cell(weeks, '2026-10-04').level).toBe(0);
    expect(cell(weeks, '2026-10-02').level).toBeNull();
    expect(cell(weeks, '2026-10-06').level).toBeNull();
    expect(cell(weeks, '2026-10-10').level).toBeNull();
  });
});

describe('rangeRate', () => {
  it('counts closed days only over the last N days, never 0% for nothing', () => {
    const habit = makeHabit({ done: ['2026-10-08', '2026-10-07', '2026-10-05'] });
    expect(rangeRate([habit], 4, ctx(TODAY))).toEqual({ done: 3, expected: 4 }); // 5th..8th, today not counted
    expect(rangeRate([], 7, ctx(TODAY))).toEqual({ done: 0, expected: 0 });
  });
});

describe('weeklyTicks and monthlyTicks', () => {
  const habits = [makeHabit({ done: ['2026-10-06', '2026-10-08', '2026-09-29', '2026-09-03'] })];
  it('buckets ticks into the last N weeks, oldest first, ending with this week', () => {
    const weeks = weeklyTicks(habits, 3, ctx(TODAY));
    expect(weeks.map((w) => [w.start, w.count])).toEqual([
      ['2026-09-21', 0],
      ['2026-09-28', 1],
      ['2026-10-05', 2],
    ]);
  });
  it('buckets ticks into the last N calendar months, oldest first', () => {
    expect(monthlyTicks(habits, 2, ctx(TODAY)).map((m) => [m.month, m.count])).toEqual([
      ['2026-09', 2],
      ['2026-10', 2],
    ]);
  });
});

describe('parseRange', () => {
  it('accepts the offered windows and falls back to 30 days', () => {
    expect(parseRange('90')).toBe(90);
    for (const bad of ['5', 'x', undefined, ['7', '30']]) expect(parseRange(bad)).toBe(30);
  });
});

describe('buildProgress', () => {
  const row = (id: string): HabitRow => ({
    id, user_id: 'u', name: id, description: null, icon: '📖', color: 'moss', start_date: '2026-10-01',
    created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z', archived_at: null,
  });
  const entries = [
    { habit: row('a'), data: makeHabit({ done: ['2026-10-07', '2026-10-08'] }) },
    { habit: row('b'), data: makeHabit({ done: ['2026-10-08'] }) },
  ];

  it('covers every habit by default, and narrows to one when the filter names it', () => {
    const all = buildProgress(entries, undefined, 7, ctx(TODAY));
    expect(all.selectedId).toBeNull();
    expect(all.habits.map((h) => h.id)).toEqual(['a', 'b']);
    expect(all.habits[0]).toMatchObject({ current: { unit: 'day', count: 2 }, longest: { count: 2 } });
    expect(all.rate).toEqual({ done: 3, expected: 14 });

    const one = buildProgress(entries, 'b', 7, ctx(TODAY));
    expect(one.selectedId).toBe('b');
    expect(one.habits.map((h) => h.id)).toEqual(['b']);
    expect(one.rate).toEqual({ done: 1, expected: 7 });
  });
  it('treats an unknown habit as all habits', () => {
    expect(buildProgress(entries, 'nope', 7, ctx(TODAY)).selectedId).toBeNull();
  });
});

describe('monthBlocks and heatTotals', () => {
  const weeks = heatmap([makeHabit({ done: ['2026-10-06', '2026-10-07', '2026-09-01'] })], false, ctx(TODAY));
  const blocks = monthBlocks(weeks, ctx(TODAY));

  it('splits the year into calendar months, oldest first, up to the current one', () => {
    expect(blocks).toHaveLength(13);
    expect(blocks[0].month).toBe('2025-10');
    expect(blocks[12].month).toBe('2026-10');
  });
  it('puts every day of the window in exactly one month, as week columns with spacers outside the month', () => {
    const cells = blocks.flatMap((b) => b.columns.flat()).filter((c) => c !== null);
    expect(cells).toHaveLength(53 * 7);
    expect(new Set(cells.map((c) => c.date)).size).toBe(53 * 7);
    for (const b of blocks) {
      for (const col of b.columns) {
        expect(col).toHaveLength(7);
        expect(col.some((c) => c !== null)).toBe(true); // no empty columns
        for (const c of col) if (c) expect(c.date.startsWith(b.month)).toBe(true);
      }
    }
  });
  it('counts ticks and active days over the year', () => {
    expect(heatTotals(weeks)).toEqual({ ticks: 3, activeDays: 3 });
  });
});
