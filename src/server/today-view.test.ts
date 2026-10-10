import { describe, expect, it } from 'vitest';
import { ctx, makeHabit } from '@/domain/test-helpers';
import type { HabitData, Schedule } from '@/domain/types';
import type { HabitRow, ScheduleRow } from './habit-view';
import { buildTodayView, earliestDate, parseDateParam, toHabitData } from './today-view';

const row = (id: string, over: Partial<HabitRow> = {}): HabitRow => ({
  id,
  user_id: 'u1',
  name: id,
  description: null,
  icon: '📖',
  color: 'moss',
  start_date: '2026-10-01',
  created_at: '2026-10-01T08:00:00Z',
  updated_at: '2026-10-01T08:00:00Z',
  archived_at: null,
  ...over,
});
const entry = (id: string, data: HabitData) => ({ habit: row(id), data });
const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => ({ kind: 'weekly_count', timesPerWeek, effectiveFrom });
const scheduleRow = (effective_from: string): ScheduleRow => ({ id: effective_from, habit_id: 'h', kind: 'daily', times_per_week: null, effective_from });

describe('toHabitData', () => {
  it('maps schedules, completions and closed and open archive periods', () => {
    const data = toHabitData(
      row('h'),
      [scheduleRow('2026-10-01')],
      [
        { habit_id: 'h', archived_on: '2026-10-03', restored_on: '2026-10-06' },
        { habit_id: 'h', archived_on: '2026-10-08', restored_on: null },
      ],
      ['2026-10-01', '2026-10-02'],
    );
    expect(data.startDate).toBe('2026-10-01');
    expect(data.schedules).toEqual([{ kind: 'daily', effectiveFrom: '2026-10-01' }]);
    expect(data.pauses).toEqual([
      { from: '2026-10-03', to: '2026-10-06' },
      { from: '2026-10-08', to: null },
    ]);
    expect([...data.completions]).toEqual(['2026-10-01', '2026-10-02']);
  });
});

describe('buildTodayView', () => {
  it('puts ticked habits in done and the rest in todo, keeping the given order', () => {
    const view = buildTodayView(
      [entry('a', makeHabit()), entry('b', makeHabit({ done: ['2026-10-09'] })), entry('c', makeHabit())],
      '2026-10-09',
      ctx(),
    );
    expect(view.todo.map((r) => r.id)).toEqual(['a', 'c']);
    expect(view.done.map((r) => [r.id, r.ticked])).toEqual([['b', true]]);
    expect(view.hasHabits).toBe(true);
  });

  it('shows the current streak on today only', () => {
    const habits = [entry('a', makeHabit({ done: ['2026-10-06', '2026-10-07', '2026-10-08'] }))];
    expect(buildTodayView(habits, '2026-10-09', ctx()).todo[0].streak).toEqual({ unit: 'day', count: 3 });
    expect(buildTodayView(habits, '2026-10-08', ctx()).done[0].streak).toBeNull();
  });

  it('has no streak tag when the streak is 0', () => {
    expect(buildTodayView([entry('a', makeHabit())], '2026-10-09', ctx()).todo[0].streak).toBeNull();
  });

  it('shows weekly progress and flips goalMet as ticks are added and removed', () => {
    const base = { startDate: '2026-09-21', schedules: [weekly(3, '2026-09-21')] };
    const two = buildTodayView([entry('w', makeHabit({ ...base, done: ['2026-10-05', '2026-10-06'] }))], '2026-10-09', ctx());
    expect(two.todo[0].week).toEqual({ done: 2, target: 3, goalMet: false });
    const three = buildTodayView([entry('w', makeHabit({ ...base, done: ['2026-10-05', '2026-10-06', '2026-10-07'] }))], '2026-10-09', ctx());
    expect(three.todo[0].week).toEqual({ done: 3, target: 3, goalMet: true });
    expect(buildTodayView([entry('d', makeHabit())], '2026-10-09', ctx()).todo[0].week).toBeNull();
  });

  it('does not list archived habits or habits that start later, but still reports that habits exist', () => {
    const archived = entry('x', makeHabit({ pauses: [{ from: '2026-10-05', to: null }] }));
    const later = entry('y', makeHabit({ startDate: '2026-10-12' }));
    const view = buildTodayView([archived, later], '2026-10-09', ctx());
    expect([view.todo.length, view.done.length]).toEqual([0, 0]);
    expect(view.hasHabits).toBe(true);
  });

  it('reports no habits when every habit is archived, or there are none', () => {
    expect(buildTodayView([entry('x', makeHabit({ pauses: [{ from: '2026-10-05', to: null }] }))], '2026-10-09', ctx()).hasHabits).toBe(false);
    expect(buildTodayView([], '2026-10-09', ctx()).hasHabits).toBe(false);
  });

  it('lists a habit again after a restore, with its earlier ticks', () => {
    const restored = makeHabit({ done: ['2026-10-02'], pauses: [{ from: '2026-10-03', to: '2026-10-06' }] });
    const view = buildTodayView([entry('r', restored)], '2026-10-02', ctx());
    expect(view.done.map((r) => r.id)).toEqual(['r']);
    expect(buildTodayView([entry('r', restored)], '2026-10-09', ctx()).todo.map((r) => r.id)).toEqual(['r']);
  });
});

describe('parseDateParam', () => {
  it('accepts a real date up to today', () => {
    expect(parseDateParam('2026-10-08', '2026-10-09')).toBe('2026-10-08');
    expect(parseDateParam('2026-10-09', '2026-10-09')).toBe('2026-10-09');
  });

  it.each([['2026-10-10'], ['nonsense'], [''], [undefined], [['2026-10-08']], ['2026-02-30']])('falls back to today for %j', (value) => {
    expect(parseDateParam(value as string | string[] | undefined, '2026-10-09')).toBe('2026-10-09');
  });
});

describe('earliestDate', () => {
  it('is the earliest start date among habits that are not archived', () => {
    const habits = [
      { data: makeHabit({ startDate: '2026-10-04' }) },
      { data: makeHabit({ startDate: '2026-10-02' }) },
      { data: makeHabit({ startDate: '2026-09-01', pauses: [{ from: '2026-09-20', to: null }] }) },
    ];
    expect(earliestDate(habits, '2026-10-09')).toBe('2026-10-02');
  });

  it('is today when there are no habits', () => {
    expect(earliestDate([], '2026-10-09')).toBe('2026-10-09');
  });
});
