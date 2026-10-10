import { describe, expect, it } from 'vitest';
import { scheduleMsg } from './schedule-label';
import { tr } from './test-translate';
import { streakLengthMsg, streakMsg, weekMsg } from './today-labels';

describe('streakMsg', () => {
  it('counts days for a daily habit', () => {
    expect(tr(streakMsg({ unit: 'day', count: 1 }))).toBe('🔥 1 day');
    expect(tr(streakMsg({ unit: 'day', count: 12 }))).toBe('🔥 12 days');
  });

  it('counts weeks for a weekly habit', () => {
    expect(tr(streakMsg({ unit: 'week', count: 1 }))).toBe('1 week streak');
    expect(tr(streakMsg({ unit: 'week', count: 4 }))).toBe('4 week streak');
  });
});

describe('streakLengthMsg', () => {
  it('is the length on its own', () => {
    expect(tr(streakLengthMsg({ unit: 'day', count: 3 }))).toBe('3 days');
    expect(tr(streakLengthMsg({ unit: 'week', count: 1 }))).toBe('1 week');
  });
});

describe('weekMsg', () => {
  it('shows progress until the goal is met, then says so', () => {
    expect(tr(weekMsg({ done: 1, target: 3, goalMet: false }))).toBe('1 of 3 this week');
    expect(tr(weekMsg({ done: 3, target: 3, goalMet: true }))).toBe('Goal met');
    expect(tr(weekMsg({ done: 4, target: 3, goalMet: true }))).toBe('Goal met');
  });
});

describe('scheduleMsg', () => {
  it('names a daily and a weekly schedule', () => {
    expect(tr(scheduleMsg({ kind: 'daily', effectiveFrom: '2026-10-01' }))).toBe('Every day');
    expect(tr(scheduleMsg({ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-10-01' }))).toBe('3× a week');
  });
});
