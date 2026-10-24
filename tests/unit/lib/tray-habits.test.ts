import { describe, expect, it } from 'vitest';
import { trayHabits } from '@/lib/tray-habits';

const row = (id: string, name: string) => {
  return { id, name, icon: '📖', color: 'moss' as const };
};

describe('the habits the tray offers to start a focus session on', () => {
  it('lists the habits still open today, in the order Home shows them', () => {
    expect(trayHabits([row('a', 'Read'), row('b', 'Run')])).toEqual([
      { id: 'a', name: 'Read' },
      { id: 'b', name: 'Run' },
    ]);
  });

  it('offers at most ten, so the menu stays short', () => {
    const many = Array.from({ length: 14 }, (_, index) => {
      return row(String(index), `Habit ${index}`);
    });

    expect(trayHabits(many)).toHaveLength(10);
  });

  it('offers none when nothing is open', () => {
    expect(trayHabits([])).toEqual([]);
  });
});
