import { describe, expect, it } from 'vitest';
import { planScheduleChange } from './schedule-change';
import type { Schedule } from './types';

const daily = (effectiveFrom: string): Schedule => ({ kind: 'daily', effectiveFrom });
const weekly = (timesPerWeek: number, effectiveFrom: string): Schedule => ({ kind: 'weekly_count', timesPerWeek, effectiveFrom });

// Fri 2026-10-09; with Monday weeks the next edit date is 2026-10-12, with Sunday weeks 2026-10-11.
const base = { startDate: '2026-09-01', today: '2026-10-09', weekStartsOn: 1 as const, hasCompletions: true };

describe('planScheduleChange, habit with history', () => {
  it('schedules a different schedule from next week', () => {
    expect(planScheduleChange({ ...base, schedules: [daily('2026-09-01')], desired: { kind: 'weekly_count', timesPerWeek: 3 } })).toEqual({
      action: 'upsert',
      schedule: weekly(3, '2026-10-12'),
    });
  });

  it('uses Sunday as the effective day when weeks start on Sunday', () => {
    expect(planScheduleChange({ ...base, weekStartsOn: 7, schedules: [daily('2026-09-01')], desired: { kind: 'weekly_count', timesPerWeek: 2 } })).toEqual({
      action: 'upsert',
      schedule: weekly(2, '2026-10-11'),
    });
  });

  it('does nothing when the desired schedule is already in effect', () => {
    expect(planScheduleChange({ ...base, schedules: [daily('2026-09-01')], desired: { kind: 'daily' } })).toEqual({ action: 'none' });
    expect(planScheduleChange({ ...base, schedules: [weekly(3, '2026-09-01')], desired: { kind: 'weekly_count', timesPerWeek: 3 } })).toEqual({ action: 'none' });
  });

  it('drops the pending change when the user changes back', () => {
    const schedules = [daily('2026-09-01'), weekly(3, '2026-10-12')];
    expect(planScheduleChange({ ...base, schedules, desired: { kind: 'daily' } })).toEqual({ action: 'delete_pending' });
  });

  it('replaces a pending change with a different one', () => {
    const schedules = [daily('2026-09-01'), weekly(3, '2026-10-12')];
    expect(planScheduleChange({ ...base, schedules, desired: { kind: 'weekly_count', timesPerWeek: 4 } })).toEqual({
      action: 'upsert',
      schedule: weekly(4, '2026-10-12'),
    });
  });

  it('does nothing when the pending change already matches', () => {
    const schedules = [daily('2026-09-01'), weekly(3, '2026-10-12')];
    expect(planScheduleChange({ ...base, schedules, desired: { kind: 'weekly_count', timesPerWeek: 3 } })).toEqual({ action: 'none' });
  });
});

describe('planScheduleChange, habit without ticks', () => {
  const fresh = { ...base, startDate: '2026-10-01', hasCompletions: false };

  it('rewrites the schedule from the start date', () => {
    expect(planScheduleChange({ ...fresh, schedules: [daily('2026-10-01')], desired: { kind: 'weekly_count', timesPerWeek: 2 } })).toEqual({
      action: 'replace_all',
      schedule: weekly(2, '2026-10-01'),
    });
  });

  it('does nothing when it already is the single schedule', () => {
    expect(planScheduleChange({ ...fresh, schedules: [daily('2026-10-01')], desired: { kind: 'daily' } })).toEqual({ action: 'none' });
  });

  it('collapses several rows into one', () => {
    expect(planScheduleChange({ ...fresh, schedules: [daily('2026-10-01'), weekly(3, '2026-10-12')], desired: { kind: 'daily' } })).toEqual({
      action: 'replace_all',
      schedule: daily('2026-10-01'),
    });
  });
});
