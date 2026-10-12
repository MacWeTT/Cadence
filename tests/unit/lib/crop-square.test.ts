import { describe, expect, it } from 'vitest';
import { squareCrop } from '@/lib/crop-square';

describe('squareCrop', () => {
  it('takes the middle of a wide picture', () => {
    expect(squareCrop(1600, 900)).toEqual({ sx: 350, sy: 0, side: 900 });
  });

  it('takes the middle of a tall picture', () => {
    expect(squareCrop(900, 1600)).toEqual({ sx: 0, sy: 350, side: 900 });
  });

  it('keeps a square picture whole', () => {
    expect(squareCrop(500, 500)).toEqual({ sx: 0, sy: 0, side: 500 });
  });

  it('rounds an odd leftover down to a whole pixel', () => {
    expect(squareCrop(101, 100)).toEqual({ sx: 0, sy: 0, side: 100 });
  });
});
