import { describe, expect, it } from 'vitest';
import { fetchAll } from './fetch-all';

const source = (n: number) => {
  return async (from: number, to: number) => {
    return {
      data: Array.from({ length: n }, (_, i) => {
        return i;
      }).slice(from, to + 1),
      error: null,
    };
  };
};

describe('fetchAll', () => {
  it('returns everything when it spans several pages', async () => {
    expect(await fetchAll(source(2500))).toHaveLength(2500);
  });
  it('stops after a short page, including an exact multiple of the page size', async () => {
    expect(await fetchAll(source(10))).toHaveLength(10);
    expect(await fetchAll(source(2000))).toHaveLength(2000);
    expect(await fetchAll(source(0))).toHaveLength(0);
  });
  it('throws the error it is given', async () => {
    await expect(
      fetchAll(async () => {
        return { data: null, error: { message: 'boom' } };
      }),
    ).rejects.toMatchObject({
      message: 'boom',
    });
  });
});
