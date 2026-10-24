import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError, fetchJson } from '@/lib/query/fetch-json';

const answer = (status: number, body: unknown = {}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return new Response(JSON.stringify(body), { status });
    }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchJson', () => {
  it('returns the JSON of a good answer', async () => {
    answer(200, { ok: 1 });

    expect(await fetchJson('/api/x')).toEqual({ ok: 1 });
  });

  it('throws an HttpError that carries the status, so a page can tell not found from a broken network', async () => {
    answer(404);

    const error: unknown = await fetchJson('/api/x').catch(e => {
      return e;
    });

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  });

  it('keeps the message other code already reads', async () => {
    answer(500);

    await expect(fetchJson('/api/x')).rejects.toThrow('Request failed (500)');
  });
});
