import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CIRCLE_DB_CODES, circleErrorCode } from '@/server/circle-errors';

const MIGRATION = readFileSync('supabase/migrations/20261019100000_circles.sql', 'utf8');

describe('circleErrorCode', () => {
  it.each([
    ['circle_full', 'circleFull'],
    ['too_many_circles', 'tooManyCircles'],
    ['invite_invalid', 'inviteInvalid'],
    ['already_member', 'alreadyMember'],
    ['not_owner', 'notOwner'],
    ['not_a_member', 'notAMember'],
    ['invalid_name', 'circleNameInvalid'],
    ['cheers_off', 'cheersOff'],
    ['cheer_date', 'cheerDate'],
    ['not_signed_in', 'signIn'],
  ] as const)('turns %s into the message %s', (code, expected) => {
    expect(circleErrorCode(code)).toBe(expected);
  });

  it('keeps the codes a person cannot reach from the screens as the generic message', () => {
    for (const code of [
      'use_leave',
      'cannot_cheer_self',
      'not_your_habit',
      'viewer_not_member',
      'invalid_viewer',
      'invalid_level',
      'invalid_label',
    ]) {
      expect(circleErrorCode(code), code).toBe('generic');
    }
  });

  it('answers a message it has never seen with the generic message', () => {
    expect(circleErrorCode('something else')).toBe('generic');
    expect(circleErrorCode('')).toBe('generic');
  });
});

describe('every code the database can raise', () => {
  it('has been given a message on purpose, so a new code cannot slip through unmapped', () => {
    const raised = new Set(
      [...MIGRATION.matchAll(/raise exception '([a-z_]+)'/g)].map(([, code]) => {
        return code;
      }),
    );

    expect(raised.size).toBeGreaterThan(10);

    for (const code of raised) {
      expect(Object.keys(CIRCLE_DB_CODES), code).toContain(code);
    }
  });
});
