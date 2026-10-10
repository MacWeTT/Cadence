import { describe, expect, it } from 'vitest';
import { completionErrorMessage } from './completion-errors';

describe('completionErrorMessage', () => {
  const known = ['habit_not_found', 'habit_archived', 'date_in_future', 'before_start'];

  it('gives each database rule its own readable message', () => {
    const messages = known.map(completionErrorMessage);

    expect(new Set(messages).size).toBe(known.length);

    for (const m of messages) {
      expect(m).not.toMatch(/_/);
    }
  });

  it('falls back to a generic message for anything else', () => {
    expect(completionErrorMessage('something odd')).toBe("Couldn't save that. Try again.");
  });
});
