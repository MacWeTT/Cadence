import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CIRCLE_LIMITS,
  LABELS,
  LEVELS,
  SHARE_LEVELS,
  atLeast,
  circleNameProblem,
  isLabel,
  isLevel,
  isShareLevel,
  levelRank,
  reveal,
} from '@/domain/circles';

const MIGRATION = readFileSync('supabase/migrations/20261019100000_circles.sql', 'utf8');

describe('levels', () => {
  it('are ordered from nothing to everything', () => {
    expect([...LEVELS]).toEqual(['hidden', 'showed_up', 'done_today', 'streaks', 'everything']);
  });

  it('are stored without hidden, because no share means hidden', () => {
    expect([...SHARE_LEVELS]).toEqual(['showed_up', 'done_today', 'streaks', 'everything']);
  });

  it('rank by their order, and atLeast compares ranks', () => {
    expect(levelRank('hidden')).toBe(0);
    expect(levelRank('everything')).toBe(4);
    expect(atLeast('streaks', 'done_today')).toBe(true);
    expect(atLeast('done_today', 'done_today')).toBe(true);
    expect(atLeast('showed_up', 'done_today')).toBe(false);
  });

  it('are recognised by the guards, and nothing else is', () => {
    expect(isLevel('hidden')).toBe(true);
    expect(isLevel('Streaks')).toBe(false);
    expect(isLevel(undefined)).toBe(false);
    expect(isShareLevel('hidden')).toBe(false);
    expect(isShareLevel('everything')).toBe(true);
    expect(isLabel('emoji')).toBe(true);
    expect(isLabel('icon')).toBe(false);
    expect([...LABELS]).toEqual(['name', 'emoji', 'generic']);
  });
});

describe('reveal', () => {
  it('shows nothing at Hidden and only that someone showed up at Showed up', () => {
    expect(reveal('hidden')).toEqual({ habit: false, done: false, streak: false, history: false });
    expect(reveal('showed_up')).toEqual({ habit: false, done: false, streak: false, history: false });
  });

  it('names the habit and its day at Done today, and nothing more', () => {
    expect(reveal('done_today')).toEqual({ habit: true, done: true, streak: false, history: false });
  });

  it('adds the streak at Streaks, and the history only at Everything', () => {
    expect(reveal('streaks')).toEqual({ habit: true, done: true, streak: true, history: false });
    expect(reveal('everything')).toEqual({ habit: true, done: true, streak: true, history: true });
  });

  it('never has a field about what was missed', () => {
    for (const level of LEVELS) {
      expect(Object.keys(reveal(level)).join(' ')).not.toMatch(/miss/i);
    }
  });
});

describe('circleNameProblem', () => {
  it('accepts a name, trimmed', () => {
    expect(circleNameProblem('Study group')).toBeNull();
    expect(circleNameProblem('  Run club  ')).toBeNull();
    expect(circleNameProblem('x'.repeat(CIRCLE_LIMITS.nameMax))).toBeNull();
  });

  it('refuses an empty name and one that is too long', () => {
    expect(circleNameProblem('')).toBe('required');
    expect(circleNameProblem('    ')).toBe('required');
    expect(circleNameProblem('x'.repeat(CIRCLE_LIMITS.nameMax + 1))).toBe('tooLong');
  });
});

describe('limits and levels agree with the database', () => {
  it('uses the same member and circle limits as the triggers', () => {
    expect(MIGRATION).toContain(`>= ${CIRCLE_LIMITS.maxMembers} then`);
    expect(MIGRATION).toContain(`>= ${CIRCLE_LIMITS.maxCircles} then`);
  });

  it('uses the same name length and invite lifetime', () => {
    expect(MIGRATION).toContain(`between 1 and ${CIRCLE_LIMITS.nameMax}`);
    expect(MIGRATION).toContain(`interval '${CIRCLE_LIMITS.inviteDays} days'`);
  });

  it('lists the same levels, in the same order, as the share table', () => {
    const quoted = (levels: readonly string[]) => {
      return levels
        .map(level => {
          return `'${level}'`;
        })
        .join(', ');
    };

    expect(MIGRATION).toContain(`check (level in (${quoted(SHARE_LEVELS)}))`);
    expect(MIGRATION).toContain(`check (level in (${quoted(LEVELS)}))`);
    expect(MIGRATION).toContain(`check (label in (${quoted(LABELS)}))`);
  });
});
