import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChanges } from '@/data/local/changes';
import { createReads } from '@/data/local/reads';
import { migrate } from '@/data/local/migrations';
import { readBackup } from '@/data/local/backup';
import { decideSync, createSync, type AccountPort, type AccountSettings } from '@/data/local/sync';
import type { Backup, BackupSummary } from '@/lib/backup-types';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const NOW = new Date('2026-10-24T12:00:00Z');
const DEFAULTS: AccountSettings = {
  display_name: 'Account Name',
  tag: 'acct',
  timezone: 'UTC',
  week_starts_on: 1,
  sound_id: 'bell',
  sound_volume: 0.6,
  accent: null,
  accent_custom: null,
  password_set: true,
  avatar_kind: 'character',
  avatar_value: 'robot',
  avatar_color: '#7c9a6d',
  avatar_url: 'https://lh3.example/photo.jpg',
};

const summary = (habits: number): BackupSummary => {
  return { habits, ticks: 0, focusSessions: 0 };
};

describe('which of the four cases a sign-in is', () => {
  const base = { linkedUserId: null, declinedUserId: null, userId: 'u1' };

  it('does nothing for a file already linked to this account', () => {
    expect(decideSync({ ...base, linkedUserId: 'u1', local: summary(3), account: summary(2) })).toBe('linked');
  });

  it('offers an upload when the PC has data and the account has none', () => {
    expect(decideSync({ ...base, local: summary(3), account: summary(0) })).toBe('offerUpload');
  });

  it('pulls when the PC has none and the account has data', () => {
    expect(decideSync({ ...base, local: summary(0), account: summary(2) })).toBe('pull');
  });

  it('asks which to keep when both have data', () => {
    expect(decideSync({ ...base, local: summary(3), account: summary(2) })).toBe('ask');
  });

  it('only links when neither has data', () => {
    expect(decideSync({ ...base, local: summary(0), account: summary(0) })).toBe('nothing');
  });

  it('runs the table again for a different account than the file is linked to', () => {
    expect(decideSync({ ...base, linkedUserId: 'other', local: summary(3), account: summary(2) })).toBe('ask');
  });

  it('does not ask again for an upload the person said no to, but does if the account now has data', () => {
    expect(decideSync({ ...base, declinedUserId: 'u1', local: summary(3), account: summary(0) })).toBe('declined');
    expect(decideSync({ ...base, declinedUserId: 'u1', local: summary(3), account: summary(1) })).toBe('ask');
  });
});

/** An account in memory: what the sync can do to it, and what it holds. */
const account = (over: Partial<AccountSettings> = {}, held: Backup | null = null) => {
  const state = { backup: held, settings: { ...DEFAULTS, ...over }, replaced: 0, failReplace: false };
  const port: AccountPort = {
    counts: () => {
      return Promise.resolve({
        habits: state.backup?.habits.length ?? 0,
        ticks:
          state.backup?.habits.reduce((sum, { ticks }) => {
            return sum + ticks.length;
          }, 0) ?? 0,
        focusSessions: 0,
      });
    },
    readBackup: () => {
      return Promise.resolve(state.backup as Backup);
    },
    replace: backup => {
      if (state.failReplace) {
        return Promise.reject(new Error('offline'));
      }

      state.replaced += 1;
      state.backup = backup;

      return Promise.resolve();
    },
    settings: () => {
      return Promise.resolve(state.settings);
    },
    saveSettings: patch => {
      state.settings = { ...state.settings, ...patch };

      return Promise.resolve();
    },
  };

  return { state, port };
};

const habit = { name: 'Read', icon: '📖', color: 'moss', kind: 'daily', startDate: '2026-10-20', links: [] };

const pcWithHabits = async (names: string[]) => {
  const sql = memorySql();

  await migrate(sql);

  for (const [index, name] of names.entries()) {
    vi.setSystemTime(new Date(NOW.getTime() + index * 1000));
    await createChanges(sql).createHabit({ ...habit, name });
  }

  vi.setSystemTime(NOW);

  return sql;
};

const marker = async (sql: Awaited<ReturnType<typeof pcWithHabits>>, key: string) => {
  const [row] = await sql.select<{ value: string }>('select value from meta where key = ?', [key]);

  return row?.value ?? null;
};

describe('the first-sign-in sync', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the case from the counts on both sides and the marker in the file', async () => {
    const sql = await pcWithHabits(['Read']);
    const { port } = account();
    const sync = createSync(sql, port);

    expect(await sync.check('u1')).toMatchObject({ plan: 'offerUpload', local: { habits: 1 }, account: { habits: 0 } });

    await sync.link('u1');

    expect(await sync.check('u1')).toMatchObject({ plan: 'linked' });
  });

  it('uploads the PC data, then pulls the account copy straight back, and links the file', async () => {
    const sql = await pcWithHabits(['Read', 'Run']);
    const { state, port } = account();

    await createSync(sql, port).upload('u1');

    expect(
      state.backup?.habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['Read', 'Run']);
    expect(state.replaced).toBe(1);
    expect(
      (await readBackup(sql)).habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['Read', 'Run']);
    expect(await marker(sql, 'linked_user_id')).toBe('u1');
  });

  it('carries the PC settings to an account that still has the defaults, and leaves chosen ones alone', async () => {
    const sql = await pcWithHabits(['Read']);

    await sql.batch([
      {
        query: "update profile set timezone = 'Asia/Kolkata', week_starts_on = 7, sound_id = 'chime', accent = 'clay'",
      },
    ]);

    const fresh = account();

    await createSync(sql, fresh.port).upload('u1');

    expect(fresh.state.settings).toMatchObject({
      timezone: 'Asia/Kolkata',
      week_starts_on: 7,
      sound_id: 'chime',
      accent: 'clay',
    });
    expect(fresh.state.settings).toMatchObject({ display_name: 'Account Name', tag: 'acct' });

    const chosen = account({ timezone: 'Europe/Paris', week_starts_on: 7 });

    await createSync(sql, chosen.port).upload('u2');

    expect(chosen.state.settings).toMatchObject({ timezone: 'Europe/Paris', week_starts_on: 7, sound_id: 'chime' });
  });

  it('refuses a PC with more than an import takes, before sending anything', async () => {
    const sql = await pcWithHabits([]);
    const rows = Array.from({ length: 501 }, (_, index) => {
      return {
        query:
          "insert into habits (id, name, icon, color, start_date, created_at, updated_at) values (?, 'h', '📖', 'moss', '2026-10-20', '2026-10-20T00:00:00.000Z', '2026-10-20T00:00:00.000Z')",
        params: [`h${index}`],
      };
    });

    await sql.batch(rows);

    const { state, port } = account();

    await expect(createSync(sql, port).upload('u1')).rejects.toThrow(/500 habits/);
    expect(state.replaced).toBe(0);
    expect(await marker(sql, 'linked_user_id')).toBeNull();
  });

  it('changes nothing and does not link when the upload fails', async () => {
    const sql = await pcWithHabits(['Read']);
    const { state, port } = account();

    state.failReplace = true;

    await expect(createSync(sql, port).upload('u1')).rejects.toThrow('offline');
    expect((await readBackup(sql)).habits).toHaveLength(1);
    expect(await marker(sql, 'linked_user_id')).toBeNull();
  });

  it('pulls the account data and settings onto the PC, replacing what was there, and links the file', async () => {
    const source = await pcWithHabits(['Account habit']);
    const held = await readBackup(source);
    const sql = await pcWithHabits([]);
    const { port } = account({ timezone: 'Asia/Kolkata', week_starts_on: 7, sound_id: 'chime' }, held);

    await createSync(sql, port).pull('u1');

    expect(
      (await readBackup(sql)).habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['Account habit']);
    expect(await sql.select('select display_name, tag, timezone, week_starts_on, sound_id from profile')).toEqual([
      { display_name: 'Account Name', tag: 'acct', timezone: 'Asia/Kolkata', week_starts_on: 7, sound_id: 'chime' },
    ]);
    expect(await marker(sql, 'linked_user_id')).toBe('u1');
  });

  it('brings the account avatar and the password flag onto the PC, so the profile and its warning match the account', async () => {
    const source = await pcWithHabits(['Account habit']);
    const sql = await pcWithHabits([]);
    const { port } = account({}, await readBackup(source));

    await createSync(sql, port).pull('u1');

    expect(
      await sql.select('select avatar_kind, avatar_value, avatar_color, avatar_url, password_set from profile'),
    ).toEqual([
      {
        avatar_kind: 'character',
        avatar_value: 'robot',
        avatar_color: '#7c9a6d',
        avatar_url: 'https://lh3.example/photo.jpg',
        password_set: 1,
      },
    ]);
    expect(await createReads(sql).profile()).toMatchObject({
      passwordSet: true,
      avatar: { kind: 'character', value: 'robot' },
    });
  });

  it('keeps the account side: saves a safety copy of the PC first, then overwrites it', async () => {
    const source = await pcWithHabits(['Account habit']);
    const sql = await pcWithHabits(['PC habit']);
    const { port } = account({}, await readBackup(source));

    await createSync(sql, port).keepAccount('u1');

    expect(
      (await readBackup(sql)).habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['Account habit']);

    const [copy] = await sql.select<{ key: string; value: string }>(
      "select key, value from meta where key like 'safety_copy:%'",
    );

    expect(copy.key).toMatch(/^safety_copy:2026-10-24T12:00:00/);
    expect(
      (JSON.parse(copy.value) as Backup).habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['PC habit']);
  });

  it('keeps the PC side: the account is overwritten and the PC copy is unchanged in content', async () => {
    const source = await pcWithHabits(['Account habit']);
    const sql = await pcWithHabits(['PC habit']);
    const { state, port } = account({}, await readBackup(source));

    await createSync(sql, port).keepPc('u1');

    expect(
      state.backup?.habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['PC habit']);
    expect(
      (await readBackup(sql)).habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['PC habit']);
    expect(await sql.select("select key from meta where key like 'safety_copy:%'")).toEqual([]);
  });

  it('remembers a no to an upload, and only keeps the three newest safety copies', async () => {
    const sql = await pcWithHabits(['PC habit']);
    const { port } = account();
    const sync = createSync(sql, port);

    await sync.decline('u1');

    expect(await sync.check('u1')).toMatchObject({ plan: 'declined' });

    for (let minute = 0; minute < 5; minute++) {
      vi.setSystemTime(new Date(NOW.getTime() + minute * 60_000));
      await sync.saveSafetyCopy();
    }

    expect(await sql.select("select key from meta where key like 'safety_copy:%'")).toHaveLength(3);
  });
});
