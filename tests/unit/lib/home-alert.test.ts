import { describe, expect, it } from 'vitest';
import { homeAlert } from '@/lib/home-alert';
import type { HomeData } from '@/server/home';
import { tr } from '@tests/support/translate';

const row = (id: string, name: string) => {
  return { id, name, week: null, streak: { count: 12, unit: 'day' } };
};

const data = (over: Partial<{ todo: unknown[]; done: unknown[]; atRisk: unknown[] }> = {}): HomeData => {
  const { todo = [], done = [], atRisk = [] } = over;

  return {
    view: { hasHabits: true, todo, done, optional: [], strip: [] },
    atRisk,
    today: '2026-10-24',
    name: 'Mac',
    timezone: 'UTC',
    weekStartsOn: 1,
  } as unknown as HomeData;
};

describe('the Home alert for the data on the page', () => {
  it('warns late in the day about a streak at risk, naming the habit', () => {
    const alert = homeAlert(
      data({ todo: [row('read', 'Read')], atRisk: [row('read', 'Read')] }),
      new Date('2026-10-24T22:30:00Z'),
    );

    expect(alert.tier).toBe('late');
    expect(tr(alert.message)).toContain('Read');
  });

  it('says nothing for a day with no habits, and celebrates a day with everything done', () => {
    expect(homeAlert(data(), new Date('2026-10-24T22:30:00Z')).tier).toBe('none');
    expect(homeAlert(data({ done: [row('read', 'Read')] }), new Date('2026-10-24T22:30:00Z')).tier).toBe('done');
  });

  it('reads the hour in the person timezone, not the device one', () => {
    const open = { todo: [row('read', 'Read')], atRisk: [row('read', 'Read')] };
    const zoned = { ...data(open), timezone: 'Asia/Kolkata' };

    // 17:00 UTC is 22:30 in Kolkata: late there, but only the evening (or earlier) in UTC
    expect(homeAlert(zoned, new Date('2026-10-24T17:00:00Z')).tier).toBe('late');
    expect(homeAlert(data(open), new Date('2026-10-24T17:00:00Z')).tier).not.toBe('late');
  });
});
