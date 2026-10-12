import { describe, expect, it } from 'vitest';
import { RESERVED_TAGS, isValidTag, normaliseTag } from '@/lib/tag';

describe('isValidTag', () => {
  it('accepts 3 to 30 lowercase letters, digits and underscores', () => {
    expect(isValidTag('manasbajpai18')).toBe(true);
    expect(isValidTag('john_doe')).toBe(true);
    expect(isValidTag('abc')).toBe(true);
    expect(isValidTag('a'.repeat(30))).toBe(true);
  });

  it('refuses a tag that is too short or too long', () => {
    expect(isValidTag('ab')).toBe(false);
    expect(isValidTag('')).toBe(false);
    expect(isValidTag('a'.repeat(31))).toBe(false);
  });

  it('refuses capitals, dashes, dots, spaces, an @ and emoji', () => {
    for (const bad of ['Manas', 'has-dash', 'has.dot', 'has space', '@manas', 'manas🌱']) {
      expect(isValidTag(bad)).toBe(false);
    }
  });

  it('refuses every reserved word', () => {
    for (const word of RESERVED_TAGS) {
      expect(isValidTag(word)).toBe(false);
    }
  });
});

describe('normaliseTag', () => {
  it('takes off the @ and the spaces around it, and lowercases', () => {
    expect(normaliseTag('  @Manas_B  ')).toBe('manas_b');
    expect(normaliseTag('manas')).toBe('manas');
    expect(normaliseTag('@@manas')).toBe('manas');
  });
});
