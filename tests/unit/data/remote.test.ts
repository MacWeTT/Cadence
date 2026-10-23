import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => {
  const ok = { ok: true as const };

  const answers = () => {
    return Promise.resolve(ok);
  };

  return {
    ok,
    createHabitAction: vi.fn(answers),
    updateHabitAction: vi.fn(answers),
    archiveHabitAction: vi.fn(answers),
    restoreHabitAction: vi.fn(answers),
    deleteHabitAction: vi.fn(answers),
    setCompletionAction: vi.fn(answers),
  };
});

// The actions run on the server and reach the database; here only that they are called is checked.
vi.mock('@/app/(app)/habits/actions', () => {
  const { createHabitAction, updateHabitAction, archiveHabitAction, restoreHabitAction, deleteHabitAction } = actions;

  return { createHabitAction, updateHabitAction, archiveHabitAction, restoreHabitAction, deleteHabitAction };
});
vi.mock('@/app/(app)/today/actions', () => {
  return { setCompletionAction: actions.setCompletionAction };
});

import { remote } from '@/data/remote';

const answer = { hello: 'world' };

/** The addresses the reads asked, in order. */
const asked = (): string[] => {
  return vi.mocked(fetch).mock.calls.map(([url]) => {
    return String(url);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
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

describe('the remote data source, reads', () => {
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

describe('the remote data source, habits and Today', () => {
  it('creates and edits a habit through its actions, passing the input as it is', async () => {
    const input = { name: 'Read' };

    await expect(remote.createHabit(input)).resolves.toEqual(actions.ok);
    await expect(remote.updateHabit('h1', input)).resolves.toEqual(actions.ok);

    expect(actions.createHabitAction).toHaveBeenCalledWith(input);
    expect(actions.updateHabitAction).toHaveBeenCalledWith('h1', input);
  });

  it('archives, restores and deletes a habit by its id', async () => {
    await remote.archiveHabit('h1');
    await remote.restoreHabit('h2');
    await remote.deleteHabit('h3');

    expect(actions.archiveHabitAction).toHaveBeenCalledWith('h1');
    expect(actions.restoreHabitAction).toHaveBeenCalledWith('h2');
    expect(actions.deleteHabitAction).toHaveBeenCalledWith('h3');
  });

  it('ticks and unticks a habit on a day', async () => {
    await remote.setCompletion('h1', '2026-10-20', true);
    await remote.setCompletion('h1', '2026-10-20', false);

    expect(actions.setCompletionAction).toHaveBeenNthCalledWith(1, 'h1', '2026-10-20', true);
    expect(actions.setCompletionAction).toHaveBeenNthCalledWith(2, 'h1', '2026-10-20', false);
  });

  it('hands back a refusal as the action gave it', async () => {
    const refusal = { ok: false as const, error: 'No', fieldErrors: { name: 'Give your habit a name' } };

    actions.createHabitAction.mockResolvedValueOnce(refusal as never);

    await expect(remote.createHabit({})).resolves.toEqual(refusal);
  });
});
