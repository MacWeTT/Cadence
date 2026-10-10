import { describe, expect, it } from 'vitest';
import { tr } from '@/lib/test-translate';
import { completionErrorMsg } from './completion-errors';

describe('completionErrorMsg', () => {
  const known = ['habit_not_found', 'habit_archived', 'date_in_future', 'before_start'];

  it('gives each database rule its own readable message', () => {
    const messages = known.map(code => {
      return tr(completionErrorMsg(code));
    });

    expect(new Set(messages).size).toBe(known.length);

    for (const m of messages) {
      expect(m).not.toMatch(/_/);
    }
  });

  it('falls back to a generic message for anything else', () => {
    expect(tr(completionErrorMsg('something odd'))).toBe("Couldn't save that. Try again.");
  });
});
