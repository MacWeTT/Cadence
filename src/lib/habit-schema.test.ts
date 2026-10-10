import { describe, expect, it } from 'vitest';
import en from '../../locales/en';
import { habitInputSchema, isSingleEmoji, isValidTimeZone, toFieldErrors } from './habit-schema';

const today = '2026-10-09';
const valid = { name: 'Read', icon: '📖', color: 'moss', kind: 'daily', startDate: '2026-10-01' };

const parse = (over: Record<string, unknown>) => {
  return habitInputSchema(today).safeParse({ ...valid, ...over });
};

describe('isSingleEmoji', () => {
  it.each(['📖', '👍🏽', '👨‍👩‍👧', '🇮🇳', '❤️', '1️⃣', '#️⃣', '*️⃣'])('accepts %s', e => {
    return expect(isSingleEmoji(e)).toBe(true);
  });
  it.each(['a', '1', '', '📖📖', 'ab', ' '])('rejects %j', e => {
    return expect(isSingleEmoji(e)).toBe(false);
  });
});

describe('habitInputSchema', () => {
  it('accepts a valid daily and a valid weekly habit', () => {
    expect(parse({}).success).toBe(true);
    expect(parse({ kind: 'weekly_count', timesPerWeek: 3, description: 'Before bed' }).success).toBe(true);
  });

  it('trims the name and the description', () => {
    const r = parse({ name: '  Read  ', description: '  note ' });

    expect(r.success && [r.data.name, r.data.description]).toEqual(['Read', 'note']);
  });

  it.each([
    ['a name of only spaces', { name: '   ' }],
    ['an 81-character name', { name: 'x'.repeat(81) }],
    ['a 281-character description', { description: 'x'.repeat(281) }],
    ['an unknown color', { color: 'red' }],
    ['two emoji', { icon: '📖📖' }],
    ['weekly without a count', { kind: 'weekly_count' }],
    ['weekly with 0', { kind: 'weekly_count', timesPerWeek: 0 }],
    ['weekly with 7', { kind: 'weekly_count', timesPerWeek: 7 }],
    ['weekly with 2.5', { kind: 'weekly_count', timesPerWeek: 2.5 }],
    ['daily with a count', { kind: 'daily', timesPerWeek: 3 }],
    ['a start date in the future', { startDate: '2026-10-10' }],
    ['a start date before 2000', { startDate: '1999-12-31' }],
    ['an impossible start date', { startDate: '2026-02-30' }],
  ])('rejects %s', (_name, over) => {
    expect(parse(over).success).toBe(false);
  });

  it('accepts a name of exactly 80 and a description of exactly 280 characters', () => {
    expect(parse({ name: 'x'.repeat(80), description: 'y'.repeat(280) }).success).toBe(true);
  });

  it('accepts today as the start date', () => {
    expect(parse({ startDate: today }).success).toBe(true);
  });
});

describe('toFieldErrors', () => {
  it('keeps the first message per field', () => {
    const r = parse({ name: '   ', color: 'red' });

    expect(r.success).toBe(false);

    if (!r.success) {
      expect(Object.keys(toFieldErrors(r.error)).sort()).toEqual(['color', 'name']);
    }
  });
});

describe('isValidTimeZone', () => {
  it('accepts real IANA zones and rejects nonsense', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('validation messages', () => {
  it('are all keys of locales/en/validation.json, so every problem has words', () => {
    const r = parse({
      name: '   ',
      description: 'x'.repeat(300),
      icon: 'ab',
      color: 'red',
      kind: 'weekly_count',
      startDate: 'nope',
    });
    const codes = r.success
      ? []
      : Object.values(toFieldErrors(r.error)).map(issue => {
          return issue.code;
        });

    expect(codes.length).toBeGreaterThanOrEqual(5);

    for (const code of codes) {
      expect(Object.keys(en.validation)).toContain(code);
    }
  });
});
