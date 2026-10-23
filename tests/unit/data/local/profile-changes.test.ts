import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChanges } from '@/data/local/changes';
import { createFocusChanges } from '@/data/local/focus-changes';
import { migrate } from '@/data/local/migrations';
import { createProfileChanges } from '@/data/local/profile-changes';
import { createReads } from '@/data/local/reads';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const NOW = new Date('2026-10-24T12:00:00Z');

const setup = async () => {
  const sql = memorySql();

  await migrate(sql);

  return { sql, profile: createProfileChanges(sql), reads: createReads(sql) };
};

describe('profile edits on local rows', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves a name, a tag (without the @ and capitals), and the week start', async () => {
    const { profile, reads } = await setup();

    expect(await profile.updateName({ name: '  Mac  ' })).toEqual({ ok: true });
    expect(await profile.updateTag({ tag: '@MacWeTT' })).toEqual({ ok: true });
    expect(await profile.updateWeekStart({ weekStartsOn: 7 })).toEqual({ ok: true });

    expect(await reads.profile()).toMatchObject({ name: 'Mac', tag: 'macwett', weekStartsOn: 7 });
  });

  it('refuses a bad value with the sentence for it, and saves nothing', async () => {
    const { profile, reads } = await setup();

    expect(await profile.updateName({ name: '' })).toMatchObject({ ok: false, error: expect.any(String) });
    expect(await profile.updateTag({ tag: 'no spaces!' })).toMatchObject({ ok: false });
    expect(await profile.updateWeekStart({ weekStartsOn: 3 })).toMatchObject({ ok: false });
    expect(await profile.updateTimezone({ timezone: 'Mars/Base' })).toMatchObject({ ok: false });

    expect(await reads.profile()).toMatchObject({ name: '', tag: 'me', weekStartsOn: 1, timezone: 'UTC' });
  });

  it('changes the timezone and ends a running focus session first', async () => {
    const { sql, profile, reads } = await setup();

    await createChanges(sql).createHabit({
      name: 'Read',
      icon: '📖',
      color: 'moss',
      kind: 'daily',
      startDate: '2026-10-20',
      links: [],
    });

    const [{ id }] = await sql.select<{ id: string }>('select id from habits');
    const focus = createFocusChanges(sql);

    await focus.startFocus({ habitId: id, mode: 'free', plan: null, soundId: null });
    vi.setSystemTime(new Date(NOW.getTime() + 30 * 60_000));

    expect(await profile.updateTimezone({ timezone: 'Asia/Calcutta' })).toEqual({ ok: true });
    expect((await reads.focus()).running).toBeNull();
    expect(await sql.select('select focus_seconds from focus_sessions')).toEqual([{ focus_seconds: 1800 }]);
    expect((await reads.profile()).timezone).toBe('Asia/Kolkata');
  });

  it('saves an avatar, an accent (a preset or a custom colour) and a built-in sound with its volume', async () => {
    const { profile, reads } = await setup();

    expect(await profile.updateAvatar({ kind: 'emoji', value: '🔥', color: '#ff8800' })).toEqual({ ok: true });
    expect(await profile.updateAccent({ accent: 'custom', customHex: '#12ab34' })).toEqual({ ok: true });
    expect(await profile.updateSound({ id: 'bell', volume: 0.3 })).toEqual({ ok: true });

    expect(await reads.profile()).toMatchObject({
      avatar: { kind: 'emoji', value: '🔥' },
      accent: { accent: 'custom', customHex: '#12ab34' },
      sound: { id: 'bell', volume: 0.3 },
    });

    expect(await profile.updateAccent({ accent: 'custom', customHex: 'nope' })).toMatchObject({ ok: false });
    expect(await profile.updateSound({ id: '5b1d3f0e-2c4a-4a6e-9a4c-0d3f6a2b8c11', volume: 0.5 })).toMatchObject({
      ok: false,
    });
  });

  it('says what needs an account instead of pretending: a password, a photo, an uploaded sound', async () => {
    const { profile } = await setup();
    const form = new FormData();

    for (const result of [
      await profile.setPassword({ password: 'longenough1', confirm: 'longenough1' }),
      await profile.uploadAvatarPhoto(form),
      await profile.uploadSound(form),
      await profile.removeSound('5b1d3f0e-2c4a-4a6e-9a4c-0d3f6a2b8c11'),
    ]) {
      expect(result).toMatchObject({ ok: false, error: expect.stringContaining('account') });
    }
  });
});
