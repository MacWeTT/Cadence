import { describe, expect, it } from 'vitest';
import {
  scheduleArgs,
  shouldSyncTimezone,
  toDesired,
  toListItem,
  type HabitRow,
  type ScheduleRow,
} from '@/server/habit-view';

const habit: HabitRow = {
  id: 'h1',
  user_id: 'u1',
  name: 'Read',
  description: null,
  icon: '📖',
  color: 'moss',
  start_date: '2026-10-01',
  created_at: '2026-10-01T08:00:00Z',
  updated_at: '2026-10-01T08:00:00Z',
  archived_at: null,
  links: [],
};

const daily = (effective_from: string): ScheduleRow => {
  return {
    id: effective_from,
    habit_id: 'h1',
    kind: 'daily',
    times_per_week: null,
    weekdays: null,
    effective_from,
  };
};

const weekly = (n: number, effective_from: string): ScheduleRow => {
  return {
    id: effective_from,
    habit_id: 'h1',
    kind: 'weekly_count',
    times_per_week: n,
    weekdays: null,
    effective_from,
  };
};

describe('toListItem', () => {
  it('shows the schedule in effect today and no pending change', () => {
    const item = toListItem(habit, [daily('2026-10-01')], false, '2026-10-09');

    expect(item).toMatchObject({
      id: 'h1',
      name: 'Read',
      description: null,
      icon: '📖',
      color: 'moss',
      startDate: '2026-10-01',
      archivedAt: null,
      schedule: { kind: 'daily', effectiveFrom: '2026-10-01' },
      pendingSchedule: null,
      hasCompletions: false,
    });
  });

  it('separates the pending schedule from the one in effect', () => {
    const item = toListItem(habit, [daily('2026-10-01'), weekly(3, '2026-10-12')], true, '2026-10-09');

    expect(item.schedule).toEqual({ kind: 'daily', effectiveFrom: '2026-10-01' });
    expect(item.pendingSchedule).toEqual({ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-10-12' });
    expect(item.hasCompletions).toBe(true);
  });

  it('carries the links, in order', () => {
    const item = toListItem(
      { ...habit, links: ['https://a.dev/2', 'https://a.dev/1'] },
      [daily('2026-10-01')],
      false,
      '2026-10-09',
    );

    expect(item.links).toEqual(['https://a.dev/2', 'https://a.dev/1']);
  });

  it('falls back to the earliest schedule when the start date was moved before every row', () => {
    const item = toListItem({ ...habit, start_date: '2026-09-01' }, [daily('2026-10-01')], false, '2026-09-15');

    expect(item.schedule.effectiveFrom).toBe('2026-10-01');
  });

  it('falls back to a known color for an unexpected value', () => {
    expect(toListItem({ ...habit, color: 'chartreuse' }, [daily('2026-10-01')], false, '2026-10-09').color).toBe(
      'moss',
    );
  });

  it('keeps the archive timestamp and the description', () => {
    const item = toListItem(
      { ...habit, description: 'Before bed', archived_at: '2026-10-05T10:00:00Z' },
      [daily('2026-10-01')],
      false,
      '2026-10-09',
    );

    expect([item.description, item.archivedAt]).toEqual(['Before bed', '2026-10-05T10:00:00Z']);
  });
});

describe('toListItem with the other kinds of schedule', () => {
  const row = (kind: string, weekdays: number[] | null): ScheduleRow => {
    return { id: kind, habit_id: 'h1', kind, times_per_week: null, weekdays, effective_from: '2026-10-01' };
  };

  it('reads fixed weekdays (sorted) and optional rows', () => {
    expect(toListItem(habit, [row('weekdays', [5, 1, 3])], false, '2026-10-09').schedule).toEqual({
      kind: 'weekdays',
      days: [1, 3, 5],
      effectiveFrom: '2026-10-01',
    });
    expect(toListItem(habit, [row('optional', null)], false, '2026-10-09').schedule).toEqual({
      kind: 'optional',
      effectiveFrom: '2026-10-01',
    });
  });
});

describe('toDesired and scheduleArgs', () => {
  it('turn form input into the wanted schedule', () => {
    expect(toDesired({ kind: 'daily' })).toEqual({ kind: 'daily' });
    expect(toDesired({ kind: 'weekly_count', timesPerWeek: 3 })).toEqual({ kind: 'weekly_count', timesPerWeek: 3 });
    expect(toDesired({ kind: 'weekdays', weekdays: [5, 1] })).toEqual({ kind: 'weekdays', days: [1, 5] });
    expect(toDesired({ kind: 'optional' })).toEqual({ kind: 'optional' });
  });

  it('turn a schedule into the arguments of the database functions', () => {
    expect(scheduleArgs({ kind: 'weekdays', days: [1, 3], effectiveFrom: '2026-10-12' })).toEqual({
      p_kind: 'weekdays',
      p_times_per_week: null,
      p_weekdays: [1, 3],
    });
    expect(scheduleArgs({ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-10-12' })).toEqual({
      p_kind: 'weekly_count',
      p_times_per_week: 3,
      p_weekdays: null,
    });
    expect(scheduleArgs(null)).toEqual({ p_kind: null, p_times_per_week: null, p_weekdays: null });
  });
});

describe('shouldSyncTimezone', () => {
  it('syncs only from the UTC default to a different valid zone', () => {
    expect(shouldSyncTimezone('UTC', 'Asia/Kolkata')).toBe(true);
    expect(shouldSyncTimezone('Asia/Kolkata', 'America/New_York')).toBe(false);
    expect(shouldSyncTimezone('UTC', 'UTC')).toBe(false);
    expect(shouldSyncTimezone('UTC', 'Not/AZone')).toBe(false);
  });
});
