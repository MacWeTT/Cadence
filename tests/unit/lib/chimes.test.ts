import { describe, expect, it } from 'vitest';
import { CHIME_IDS, parseChoice, recipeFor, recipeLength } from '@/lib/chimes';

describe('recipes', () => {
  it('has Bell as the first and default chime and Silent last', () => {
    expect(CHIME_IDS[0]).toBe('bell');
    expect(CHIME_IDS.at(-1)).toBe('silent');
  });

  it('keeps every chime under 1.5 seconds', () => {
    for (const id of CHIME_IDS) {
      expect(recipeLength(recipeFor(id, 'focus'))).toBeLessThanOrEqual(1.5);
    }
  });

  it('plays nothing for Silent', () => {
    expect(recipeFor('silent', 'focus')).toEqual([]);
  });

  it('makes the break cue higher and shorter than the focus cue', () => {
    for (const id of CHIME_IDS.filter(chime => {
      return chime !== 'silent';
    })) {
      const focus = recipeFor(id, 'focus');
      const rest = recipeFor(id, 'break');

      expect(rest[0].freq).toBeGreaterThan(focus[0].freq);
      expect(recipeLength(rest)).toBeLessThan(recipeLength(focus));
    }
  });
});

describe('the completion cue', () => {
  it('rises in pitch, step by step, for every chime', () => {
    for (const id of CHIME_IDS.filter(chime => {
      return chime !== 'silent';
    })) {
      const freqs = recipeFor(id, 'done').map(({ freq }) => {
        return freq;
      });

      expect(freqs).toHaveLength(3);
      expect(freqs[1]).toBeGreaterThan(freqs[0]);
      expect(freqs[2]).toBeGreaterThan(freqs[1]);
    }
  });

  it('stays under 1.5 seconds and is silent for Silent', () => {
    for (const id of CHIME_IDS) {
      expect(recipeLength(recipeFor(id, 'done'))).toBeLessThanOrEqual(1.5);
    }

    expect(recipeFor('silent', 'done')).toEqual([]);
  });
});

describe('parseChoice', () => {
  it('reads a stored choice', () => {
    expect(parseChoice('{"id":"marimba","volume":0.4}')).toEqual({ id: 'marimba', volume: 0.4 });
  });

  it('falls back to Bell at a middling volume for nothing or rubbish', () => {
    const fallback = { id: 'bell', volume: 0.6 };

    expect(parseChoice('')).toEqual(fallback);
    expect(parseChoice('not json')).toEqual(fallback);
    expect(parseChoice('{"id":"gong","volume":9}')).toEqual(fallback);
  });

  it('clamps the volume into range', () => {
    expect(parseChoice('{"id":"bell","volume":5}').volume).toBe(1);
    expect(parseChoice('{"id":"bell","volume":-1}').volume).toBe(0);
  });
});
