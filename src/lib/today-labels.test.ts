import { describe, expect, it } from 'vitest';
import { streakLabel, weekLabel } from './today-labels';

describe('streakLabel', () => {
  it('counts days for a daily habit', () => {
    expect(streakLabel({ unit: 'day', count: 1 })).toBe('🔥 1 day');
    expect(streakLabel({ unit: 'day', count: 12 })).toBe('🔥 12 days');
  });

  it('counts weeks for a weekly habit', () => {
    expect(streakLabel({ unit: 'week', count: 1 })).toBe('1 week streak');
    expect(streakLabel({ unit: 'week', count: 4 })).toBe('4 week streak');
  });
});

describe('weekLabel', () => {
  it('shows progress until the goal is met, then says so', () => {
    expect(weekLabel({ done: 1, target: 3, goalMet: false })).toBe('1 of 3 this week');
    expect(weekLabel({ done: 3, target: 3, goalMet: true })).toBe('Goal met');
    expect(weekLabel({ done: 4, target: 3, goalMet: true })).toBe('Goal met');
  });
});
