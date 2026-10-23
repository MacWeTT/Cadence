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
    startFocusAction: vi.fn(answers),
    stopFocusAction: vi.fn(answers),
    skipBreakAction: vi.fn(answers),
    pauseFocusAction: vi.fn(answers),
    resumeFocusAction: vi.fn(answers),
    discardFocusAction: vi.fn(answers),
    updateNameAction: vi.fn(answers),
    updateTagAction: vi.fn(answers),
    setPasswordAction: vi.fn(answers),
    updateWeekStartAction: vi.fn(answers),
    updateTimezoneAction: vi.fn(answers),
    updateAvatarAction: vi.fn(answers),
    uploadAvatarPhotoAction: vi.fn(answers),
    updateAccentAction: vi.fn(answers),
    updateSoundAction: vi.fn(answers),
    uploadSoundAction: vi.fn(answers),
    removeSoundAction: vi.fn(answers),
    importBackupAction: vi.fn(answers),
    deleteAccountAction: vi.fn(answers),
  };
});

// The actions run on the server and reach the database; here only that they are called is checked.
vi.mock('@/app/(app)/habits/actions', () => {
  const { createHabitAction, updateHabitAction, archiveHabitAction, restoreHabitAction, deleteHabitAction } = actions;

  return { createHabitAction, updateHabitAction, archiveHabitAction, restoreHabitAction, deleteHabitAction };
});
vi.mock('@/app/(app)/focus-actions', () => {
  const {
    startFocusAction,
    stopFocusAction,
    skipBreakAction,
    pauseFocusAction,
    resumeFocusAction,
    discardFocusAction,
  } = actions;

  return {
    startFocusAction,
    stopFocusAction,
    skipBreakAction,
    pauseFocusAction,
    resumeFocusAction,
    discardFocusAction,
  };
});
vi.mock('@/app/(app)/profile/actions', () => {
  return {
    updateNameAction: actions.updateNameAction,
    updateTagAction: actions.updateTagAction,
    setPasswordAction: actions.setPasswordAction,
    updateWeekStartAction: actions.updateWeekStartAction,
    updateTimezoneAction: actions.updateTimezoneAction,
    updateAvatarAction: actions.updateAvatarAction,
    uploadAvatarPhotoAction: actions.uploadAvatarPhotoAction,
    updateAccentAction: actions.updateAccentAction,
    updateSoundAction: actions.updateSoundAction,
    uploadSoundAction: actions.uploadSoundAction,
    removeSoundAction: actions.removeSoundAction,
  };
});
vi.mock('@/app/(app)/profile/account/actions', () => {
  return { importBackupAction: actions.importBackupAction, deleteAccountAction: actions.deleteAccountAction };
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

describe('the remote data source, focus', () => {
  it('starts a session with what the setup panel chose, as it is', async () => {
    const input = { habitId: 'h1', mode: 'free', plan: null, soundId: null };

    await expect(remote.startFocus(input)).resolves.toEqual(actions.ok);

    expect(actions.startFocusAction).toHaveBeenCalledWith(input);
  });

  it('stops, skips a break, pauses and resumes the running session', async () => {
    await remote.stopFocus();
    await remote.skipBreak();
    await remote.pauseFocus();
    await remote.resumeFocus();

    expect(actions.stopFocusAction).toHaveBeenCalledTimes(1);
    expect(actions.skipBreakAction).toHaveBeenCalledTimes(1);
    expect(actions.pauseFocusAction).toHaveBeenCalledTimes(1);
    expect(actions.resumeFocusAction).toHaveBeenCalledTimes(1);
  });

  it('drops a finished session by its id', async () => {
    await remote.discardFocus('s1');

    expect(actions.discardFocusAction).toHaveBeenCalledWith('s1');
  });
});

describe('the remote data source, profile', () => {
  it('saves each setting through its action with what the modal holds', async () => {
    await remote.updateName({ name: 'Mac' });
    await remote.updateTag({ tag: 'mac' });
    await remote.setPassword({ password: 'longenough', confirm: 'longenough' });
    await remote.updateWeekStart({ weekStartsOn: 7 });
    await remote.updateTimezone({ timezone: 'Asia/Kolkata' });
    await remote.updateAvatar({ kind: 'emoji', value: '🌱' });
    await remote.updateAccent({ accent: 'plum', customHex: null });
    await remote.updateSound({ id: 'bell', volume: 0.6 });

    expect(actions.updateNameAction).toHaveBeenCalledWith({ name: 'Mac' });
    expect(actions.updateTagAction).toHaveBeenCalledWith({ tag: 'mac' });
    expect(actions.setPasswordAction).toHaveBeenCalledWith({ password: 'longenough', confirm: 'longenough' });
    expect(actions.updateWeekStartAction).toHaveBeenCalledWith({ weekStartsOn: 7 });
    expect(actions.updateTimezoneAction).toHaveBeenCalledWith({ timezone: 'Asia/Kolkata' });
    expect(actions.updateAvatarAction).toHaveBeenCalledWith({ kind: 'emoji', value: '🌱' });
    expect(actions.updateAccentAction).toHaveBeenCalledWith({ accent: 'plum', customHex: null });
    expect(actions.updateSoundAction).toHaveBeenCalledWith({ id: 'bell', volume: 0.6 });
  });

  it('uploads a photo or a sound as the form it was chosen in, and removes a sound by its id', async () => {
    const form = new FormData();

    await remote.uploadAvatarPhoto(form);
    await remote.uploadSound(form);
    await remote.removeSound('s1');

    expect(actions.uploadAvatarPhotoAction).toHaveBeenCalledWith(form);
    expect(actions.uploadSoundAction).toHaveBeenCalledWith(form);
    expect(actions.removeSoundAction).toHaveBeenCalledWith('s1');
  });

  it('restores a backup from its file and deletes the account after the typed confirmation', async () => {
    const form = new FormData();

    await remote.importBackup(form);
    await remote.deleteAccount('me@example.com');

    expect(actions.importBackupAction).toHaveBeenCalledWith(form);
    expect(actions.deleteAccountAction).toHaveBeenCalledWith('me@example.com');
  });
});
