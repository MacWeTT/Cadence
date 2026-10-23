import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { remote } from '@/data/remote';

const answer = { hello: 'world' };

/** Every read asks one address and returns what it answers. */
const asked = (): string[] => {
  const fetchMock = vi.mocked(fetch);

  return fetchMock.mock.calls.map(([url]) => {
    return String(url);
  });
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      return Promise.resolve(new Response(JSON.stringify(answer), { status: 200 }));
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the remote data source', () => {
  it('reads each page from its own endpoint and returns the answer', async () => {
    await expect(remote.habits()).resolves.toEqual(answer);
    await expect(remote.home()).resolves.toEqual(answer);
    await expect(remote.profile()).resolves.toEqual(answer);
    await expect(remote.account()).resolves.toEqual(answer);
    await expect(remote.focus()).resolves.toEqual(answer);

    expect(asked()).toEqual(['/api/habits', '/api/home', '/api/profile', '/api/account', '/api/focus']);
  });

  it('reads Today without a date, or for one day', async () => {
    await remote.today(undefined);
    await remote.today('2026-10-20');

    expect(asked()).toEqual(['/api/today', '/api/today?date=2026-10-20']);
  });

  it('reads Progress for a filter and a window, keeping the defaults out of the address', async () => {
    await remote.progress(null, 30);
    await remote.progress('h1', 90);
    await remote.progress(null, 7);

    expect(asked()).toEqual(['/api/progress', '/api/progress?habit=h1&range=90', '/api/progress?range=7']);
  });

  it('asks for JSON', async () => {
    await remote.habits();

    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual({ headers: { Accept: 'application/json' } });
  });

  it('fails with the status when the endpoint refuses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        return Promise.resolve(new Response('no', { status: 500 }));
      }),
    );

    await expect(remote.habits()).rejects.toMatchObject({ status: 500 });
  });
});
