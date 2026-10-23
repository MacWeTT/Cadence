import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CIRCLE_COLORS,
  CIRCLE_LIMITS,
  LABELS,
  LEVELS,
  REACTIONS,
  REACTION_DAYS,
  SHARE_LEVELS,
  atLeast,
  circleNameProblem,
  closerActive,
  isLabel,
  isLevel,
  isReaction,
  isShareLevel,
  levelRank,
  reveal,
} from '@/domain/circles';
import { COLOR_KEYS } from '@/lib/palette';

const MIGRATION = readFileSync('supabase/migrations/20261019100000_circles.sql', 'utf8');
const PAIRS_MIGRATION = readFileSync('supabase/migrations/20261025100000_circle_pairs.sql', 'utf8');
const LOOK_MIGRATION = readFileSync('supabase/migrations/20261025080000_circle_look_and_reactions.sql', 'utf8');

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

describe('reactions and colours', () => {
  it('has four reactions, and recognises only those', () => {
    expect([...REACTIONS]).toEqual(['\u{1F44F}', '\u{1F525}', '\u{1F4AA}', '\u2764\uFE0F']);
    expect(isReaction('\u{1F525}')).toBe(true);
    expect(isReaction('\u2764')).toBe(false); // without the emoji variation selector it is another character
    expect(isReaction('\u{1F608}')).toBe(false);
    expect(isReaction(undefined)).toBe(false);
  });

  it('uses the same colours as the habits, so a circle can be given any of them', () => {
    expect([...CIRCLE_COLORS]).toEqual([...COLOR_KEYS]);
  });

  it('agrees with the database on the emoji, the colours and the days a reaction stays open', () => {
    const quoted = (values: readonly string[]) => {
      return values
        .map(value => {
          return `'${value}'`;
        })
        .join(', ');
    };

    expect(LOOK_MIGRATION).toContain(`check (emoji in (${quoted(REACTIONS)}))`);
    expect(LOOK_MIGRATION).toContain(`check (color in (${quoted(CIRCLE_COLORS)}))`);
    expect(LOOK_MIGRATION).toContain(`v_today - ${REACTION_DAYS}`);
  });
});

describe('closerActive', () => {
  it('is on only when both people of a pair have turned it on', () => {
    expect(closerActive([{ closer: true }, { closer: true }])).toBe(true);
    expect(closerActive([{ closer: true }, { closer: false }])).toBe(false);
    expect(closerActive([{ closer: false }, { closer: false }])).toBe(false);
  });

  it('is never on for one person waiting, or for a group of three', () => {
    expect(closerActive([{ closer: true }])).toBe(false);
    expect(closerActive([{ closer: true }, { closer: true }, { closer: true }])).toBe(false);
    expect(closerActive([])).toBe(false);
  });
});

describe('pairs agree with the database', () => {
  it('holds two people, and a group the same number as before', () => {
    expect(CIRCLE_LIMITS.pairMembers).toBe(2);
    expect(PAIRS_MIGRATION).toContain(`'pair' then ${CIRCLE_LIMITS.pairMembers} else ${CIRCLE_LIMITS.maxMembers} end`);
    expect(PAIRS_MIGRATION).toContain("check (kind in ('group', 'pair'))");
  });
});
