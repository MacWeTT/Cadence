import { readBackup, replaceStatements } from '@/data/local/backup';
import { SETTINGS_KEYS, toLocalValue } from '@/data/local/settings-columns';
import type { Sql } from '@/data/local/sql';
import { summarize } from '@/lib/backup';
import { BACKUP_LIMITS, type Backup, type BackupSummary } from '@/lib/backup-types';

/** The settings of the profile that the sync reads or carries over. */
export interface AccountSettings {
  display_name: string | null;
  tag: string;
  timezone: string;
  week_starts_on: number;
  sound_id: string;
  sound_volume: number;
  accent: string | null;
  accent_custom: string | null;
  /** The account's own: whether it has a password, and its avatar (the Google picture's address is `avatar_url`). */
  password_set: boolean;
  avatar_kind: string;
  avatar_value: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
}

/** What the sync needs from the account. In the app it is Supabase; in tests it is in memory. */
export interface AccountPort {
  counts: () => Promise<BackupSummary>;
  /** Everything the account holds, as a backup (the same one the Account tab's export writes). */
  readBackup: () => Promise<Backup>;
  /** Replaces everything on the account with a backup, all or nothing (`replace_my_data`; it makes new ids). */
  replace: (backup: Backup) => Promise<void>;
  settings: () => Promise<AccountSettings>;
  saveSettings: (patch: Partial<AccountSettings>) => Promise<void>;
}

export type SyncPlan = 'linked' | 'nothing' | 'offerUpload' | 'pull' | 'ask' | 'declined';

/** The four cases of the sync, from what each side holds and what the file remembers. */
export const decideSync = (input: {
  linkedUserId: string | null;
  declinedUserId: string | null;
  userId: string;
  local: BackupSummary;
  account: BackupSummary;
}): SyncPlan => {
  const { linkedUserId, declinedUserId, userId, local, account } = input;

  if (linkedUserId === userId) {
    return 'linked';
  }

  const onPc = local.habits > 0;
  const onAccount = account.habits > 0;

  if (onPc && onAccount) {
    return 'ask';
  }

  if (onPc) {
    return declinedUserId === userId ? 'declined' : 'offerUpload';
  }

  return onAccount ? 'pull' : 'nothing';
};

/** What the PC's settings carry over to the account while the account's own are still the defaults. */
const DEFAULT_SETTINGS: Partial<AccountSettings> = {
  timezone: 'UTC',
  week_starts_on: 1,
  sound_id: 'bell',
  sound_volume: 0.6,
  accent: null,
};

const SAFETY_COPIES = 3;

const read = async (sql: Sql, key: string): Promise<string | null> => {
  const [row] = await sql.select<{ value: string }>('select value from meta where key = ?', [key]);

  return row?.value ?? null;
};

const write = (key: string, value: string) => {
  return { query: 'insert or replace into meta (key, value) values (?, ?)', params: [key, value] };
};

const counts = async (sql: Sql): Promise<BackupSummary> => {
  const [row] = await sql.select<BackupSummary>(
    `select (select count(*) from habits) as habits, (select count(*) from habit_completions) as ticks,
            (select count(*) from focus_sessions) as focusSessions`,
  );

  return row;
};

/**
 * The sync after the first sign-in, for one PC file and one account. Nothing here touches the network except through the
 * port, so it runs in unit tests. The file is marked linked only after the last step worked, so a failure part-way
 * changes nothing and can be tried again.
 */
export const createSync = (sql: Sql, account: AccountPort) => {
  const check = async (userId: string) => {
    const [linkedUserId, declinedUserId, local, onAccount] = await Promise.all([
      read(sql, 'linked_user_id'),
      read(sql, 'declined_user_id'),
      counts(sql),
      account.counts(),
    ]);

    return {
      plan: decideSync({ linkedUserId, declinedUserId, userId, local, account: onAccount }),
      local,
      account: onAccount,
    };
  };

  const link = async (userId: string): Promise<void> => {
    await sql.batch([write('linked_user_id', userId)]);
  };

  /** What is about to be replaced on the PC, kept in the file; only the newest few are kept. */
  const saveSafetyCopy = async (): Promise<void> => {
    const backup = await readBackup(sql);

    await sql.batch([
      write(`safety_copy:${new Date().toISOString()}`, JSON.stringify(backup)),
      {
        query: `delete from meta where key like 'safety_copy:%' and key not in
                (select key from meta where key like 'safety_copy:%' order by key desc limit ${SAFETY_COPIES})`,
      },
    ]);
  };

  /** The account's data and settings onto the PC, replacing what was there, in one transaction. */
  const pullData = async (): Promise<void> => {
    const [backup, settings] = await Promise.all([account.readBackup(), account.settings()]);
    const columns = SETTINGS_KEYS.map(key => {
      return `${key} = ?`;
    }).join(', ');

    await sql.batch([
      ...replaceStatements(backup),
      {
        query: `update profile set ${columns} where id = 1`,
        params: SETTINGS_KEYS.map(key => {
          return toLocalValue(settings[key]);
        }),
      },
    ]);
  };

  const pull = async (userId: string): Promise<void> => {
    await pullData();
    await link(userId);
  };

  /** The PC's data and its settings (only where the account's are still the defaults) to the account, then back. */
  const upload = async (userId: string): Promise<void> => {
    const backup = await readBackup(sql);
    const { habits, ticks, focusSessions } = summarize(backup);

    if (habits > BACKUP_LIMITS.habits) {
      throw new Error(`Cadence can upload up to ${BACKUP_LIMITS.habits} habits; this PC has ${habits}.`);
    }

    if (ticks > BACKUP_LIMITS.ticks || focusSessions > BACKUP_LIMITS.focusSessions) {
      throw new Error(
        `Cadence can upload up to ${BACKUP_LIMITS.ticks} check-ins and ${BACKUP_LIMITS.focusSessions} focus sessions.`,
      );
    }

    await account.replace(backup);

    const [mine, theirs] = await Promise.all([
      sql.select<AccountSettings>('select * from profile where id = 1'),
      account.settings(),
    ]);
    const patch: Partial<AccountSettings> = {};

    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AccountSettings)[]) {
      if (theirs[key] === DEFAULT_SETTINGS[key] && mine[0][key] !== DEFAULT_SETTINGS[key]) {
        Object.assign(patch, { [key]: mine[0][key] });
      }
    }

    if (Object.keys(patch).length > 0) {
      await account.saveSettings(patch);
    }

    await pull(userId);
  };

  const keepPc = upload;

  const keepAccount = async (userId: string): Promise<void> => {
    await saveSafetyCopy();
    await pull(userId);
  };

  /** "No" to an upload: the data stays on the PC only, and the question is not asked again for this account. */
  const decline = async (userId: string): Promise<void> => {
    await sql.batch([write('declined_user_id', userId)]);
  };

  return { check, link, upload, pull, keepPc, keepAccount, decline, saveSafetyCopy };
};
