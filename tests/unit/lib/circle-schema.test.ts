import { describe, expect, it } from 'vitest';
import {
  cheerInput,
  circleIdInput,
  inviteTokenInput,
  overrideInput,
  prefsInput,
  shareInput,
} from '@/lib/circle-schema';

const ID = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const TOKEN = 'a'.repeat(64);

describe('circleIdInput', () => {
  it('accepts a uuid and nothing else', () => {
    expect(circleIdInput.safeParse(ID).success).toBe(true);
    expect(circleIdInput.safeParse('circle').success).toBe(false);
    expect(circleIdInput.safeParse(undefined).success).toBe(false);
  });
});

describe('inviteTokenInput', () => {
  it('accepts the 64-character token an invite is made of', () => {
    expect(inviteTokenInput.safeParse(TOKEN).success).toBe(true);
    expect(inviteTokenInput.safeParse('f'.repeat(64)).success).toBe(true);
  });

  it('refuses anything of another length or alphabet before the database is asked', () => {
    expect(inviteTokenInput.safeParse('a'.repeat(63)).success).toBe(false);
    expect(inviteTokenInput.safeParse('A'.repeat(64)).success).toBe(false);
    expect(inviteTokenInput.safeParse('g'.repeat(64)).success).toBe(false);
    expect(inviteTokenInput.safeParse(`${TOKEN} `).success).toBe(false);
  });
});

describe('shareInput', () => {
  it('accepts a habit, a circle, a level and an optional label', () => {
    expect(shareInput.safeParse({ habitId: ID, circleId: OTHER, level: 'streaks' }).success).toBe(true);
    expect(shareInput.safeParse({ habitId: ID, circleId: OTHER, level: 'hidden', label: 'emoji' }).success).toBe(true);
  });

  it('refuses a level or label that does not exist, and ids that are not ids', () => {
    expect(shareInput.safeParse({ habitId: ID, circleId: OTHER, level: 'inherit' }).success).toBe(false);
    expect(shareInput.safeParse({ habitId: ID, circleId: OTHER, level: 'done_today', label: 'icon' }).success).toBe(
      false,
    );
    expect(shareInput.safeParse({ habitId: 'x', circleId: OTHER, level: 'done_today' }).success).toBe(false);
  });
});

describe('overrideInput', () => {
  it('accepts a person and a level, including inherit to remove the override', () => {
    expect(overrideInput.safeParse({ habitId: ID, circleId: OTHER, viewerId: ID, level: 'inherit' }).success).toBe(
      true,
    );
    expect(overrideInput.safeParse({ habitId: ID, circleId: OTHER, viewerId: ID, level: 'hidden' }).success).toBe(true);
  });

  it('needs a viewer', () => {
    expect(overrideInput.safeParse({ habitId: ID, circleId: OTHER, level: 'hidden' }).success).toBe(false);
  });
});

describe('prefsInput', () => {
  it('takes two switches for a circle', () => {
    expect(prefsInput.safeParse({ circleId: ID, inWeek: false, allowCheers: true }).success).toBe(true);
    expect(prefsInput.safeParse({ circleId: ID, inWeek: 'no', allowCheers: true }).success).toBe(false);
  });
});

describe('cheerInput', () => {
  it('takes a circle, a person and a calendar date', () => {
    expect(cheerInput.safeParse({ circleId: ID, toUser: OTHER, forDate: '2026-10-19' }).success).toBe(true);
  });

  it('refuses a date that is not a real calendar date', () => {
    expect(cheerInput.safeParse({ circleId: ID, toUser: OTHER, forDate: '2026-02-30' }).success).toBe(false);
    expect(cheerInput.safeParse({ circleId: ID, toUser: OTHER, forDate: 'today' }).success).toBe(false);
  });
});
