import { describe, expect, it, vi } from 'vitest';
import { HAPTIC_PATTERNS, hapticForTick, play, type HapticEnv } from '@/lib/haptics';

const env = (over: Partial<HapticEnv> = {}): HapticEnv & { vibrate: ReturnType<typeof vi.fn> } => {
  return {
    vibrate: vi.fn(() => {
      return true;
    }),
    reducedMotion: false,
    ...over,
  } as HapticEnv & {
    vibrate: ReturnType<typeof vi.fn>;
  };
};

describe('play', () => {
  it("buzzes the phone with the kind's pattern, and says it did", () => {
    const device = env();

    expect(play('tick', device)).toBe(true);
    expect(device.vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.tick);
  });

  it('keeps a tick short, a success a double pulse, and an error the longest, so they feel different', () => {
    const total = (pattern: number | number[]) => {
      return [pattern].flat().reduce((sum, ms) => {
        return sum + ms;
      }, 0);
    };

    expect(total(HAPTIC_PATTERNS.tick)).toBeLessThan(total(HAPTIC_PATTERNS.success));
    expect(total(HAPTIC_PATTERNS.success)).toBeLessThan(total(HAPTIC_PATTERNS.error));
    expect(HAPTIC_PATTERNS.success).toHaveLength(3);
  });

  it('does nothing for a person who asked for reduced motion', () => {
    const device = env({ reducedMotion: true });

    expect(play('success', device)).toBe(false);
    expect(device.vibrate).not.toHaveBeenCalled();
  });

  it('does nothing where the browser cannot vibrate, such as iPhone Safari or a desktop', () => {
    expect(play('tick', { vibrate: undefined, reducedMotion: false })).toBe(false);
  });

  it('says so when the browser declines, and never throws', () => {
    expect(
      play(
        'tick',
        env({
          vibrate: vi.fn(() => {
            return false;
          }),
        }),
      ),
    ).toBe(false);
    expect(
      play(
        'tick',
        env({
          vibrate: vi.fn(() => {
            throw new Error('not allowed');
          }),
        }),
      ),
    ).toBe(false);
  });
});

describe('hapticForTick', () => {
  const todo = [{ id: 'a' }, { id: 'b' }];

  it('is a tick for a habit with others still to do', () => {
    expect(hapticForTick(todo, 'a')).toBe('tick');
  });

  it('is a success for the last habit of the day', () => {
    expect(hapticForTick([{ id: 'b' }], 'b')).toBe('success');
  });

  it('is a tick for a habit that was not on the list, such as one done in advance', () => {
    expect(hapticForTick([{ id: 'b' }], 'z')).toBe('tick');
    expect(hapticForTick([], 'z')).toBe('tick');
  });
});
