import { createTranslator } from 'next-intl';
import { backupErrorText } from '@/lib/backup-error-text';
import { backupFileName, parseBackup, toJson } from '@/lib/backup';
import { toCsv } from '@/lib/backup-csv';
import { BACKUP_LIMITS, type Backup, type BackupError } from '@/lib/backup-types';
import { getProfile } from '@/data/local/load';
import { failed } from '@/data/local/outcome';
import type { Sql, Statement } from '@/data/local/sql';
import type { DataSource } from '@/data/types';
import { buildBackup } from '@/server/backup-view';
import en from '@locales/en';

type AccountChanges = Pick<DataSource, 'importBackup' | 'deleteAccount'>;

const json = <T>(text: string | null): T | null => {
  return text === null ? null : (JSON.parse(text) as T);
};

/** Everything on the PC that a backup carries, as one backup (the same shape and builder as the account's export). */
export const readBackup = async (sql: Sql): Promise<Backup> => {
  const [[profile], habits, schedules, ticks, pauses, focus] = await Promise.all([
    sql.select<{ display_name: string | null; timezone: string; week_starts_on: number }>(
      'select display_name, timezone, week_starts_on from profile where id = 1',
    ),
    sql.select<{ links: string }>('select * from habits order by created_at, id'),
    sql.select<{ weekdays: string | null }>('select * from habit_schedules order by habit_id, effective_from'),
    sql.select<{ habit_id: string; completion_date: string }>(
      'select habit_id, completion_date from habit_completions order by habit_id, completion_date',
    ),
    sql.select<{ habit_id: string; archived_on: string; restored_on: string | null }>(
      'select habit_id, archived_on, restored_on from habit_archive_periods order by habit_id, archived_on',
    ),
    sql.select<{ plan: string | null }>('select * from focus_sessions order by started_at, id'),
  ]);

  return buildBackup({
    exportedAt: new Date().toISOString(),
    profile,
    habits: habits.map(({ links, ...habit }) => {
      return { ...(habit as object), links: JSON.parse(links) as string[] };
    }) as Parameters<typeof buildBackup>[0]['habits'],
    schedules: schedules.map(({ weekdays, ...schedule }) => {
      return { ...(schedule as object), weekdays: json<number[]>(weekdays) };
    }) as Parameters<typeof buildBackup>[0]['schedules'],
    ticks,
    pauses,
    focus: focus.map(({ plan, ...session }) => {
      return { ...(session as object), plan: json(plan) };
    }) as Parameters<typeof buildBackup>[0]['focus'],
  });
};

/** Ticks go in this many to a statement, so a big history is a few thousand statements, not two hundred thousand. */
const TICKS_PER_STATEMENT = 500;

/** The statements that replace every habit and its history with a backup's (the settings are left alone). New ids. */
export const replaceStatements = (backup: Backup): Statement[] => {
  const now = new Date().toISOString();
  const statements: Statement[] = [{ query: 'delete from habits' }];

  for (const habit of backup.habits) {
    const id = crypto.randomUUID();
    const { name, description, icon, color, startDate, createdAt, links, archivedAt } = habit;
    const { schedules, ticks, focusSessions, pauses } = habit;
    const created = createdAt ?? now;

    statements.push({
      query:
        'insert into habits (id, name, description, icon, color, start_date, links, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      params: [id, name, description?.trim() || null, icon, color, startDate, JSON.stringify(links), created, now],
    });

    for (const { kind, timesPerWeek, weekdays, effectiveFrom } of schedules) {
      statements.push({
        query:
          'insert into habit_schedules (id, habit_id, kind, times_per_week, weekdays, effective_from) values (?, ?, ?, ?, ?, ?)',
        params: [
          crypto.randomUUID(),
          id,
          kind,
          timesPerWeek,
          weekdays ? JSON.stringify(weekdays) : null,
          effectiveFrom,
        ],
      });
    }

    for (let from = 0; from < ticks.length; from += TICKS_PER_STATEMENT) {
      const dates = ticks.slice(from, from + TICKS_PER_STATEMENT);

      statements.push({
        query: `insert into habit_completions (id, habit_id, completion_date, created_at) values ${dates
          .map(() => {
            return '(?, ?, ?, ?)';
          })
          .join(', ')}`,
        params: dates.flatMap(date => {
          return [crypto.randomUUID(), id, date, now];
        }),
      });
    }

    for (const { startedAt, endedAt, mode, plan, skippedSeconds, focusSeconds } of focusSessions) {
      statements.push({
        query:
          'insert into focus_sessions (id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, focus_seconds) values (?, ?, ?, ?, ?, ?, ?, ?)',
        params: [
          crypto.randomUUID(),
          id,
          startedAt,
          endedAt,
          mode,
          plan ? JSON.stringify(plan) : null,
          skippedSeconds,
          focusSeconds,
        ],
      });
    }

    for (const { archivedOn, restoredOn } of pauses) {
      statements.push({
        query: 'insert into habit_archive_periods (id, habit_id, archived_on, restored_on) values (?, ?, ?, ?)',
        params: [crypto.randomUUID(), id, archivedOn, restoredOn],
      });
    }

    if (archivedAt) {
      statements.push({ query: 'update habits set archived_at = ? where id = ?', params: [archivedAt, id] });
    }
  }

  return statements;
};

/** Replaces every habit and its history on the PC with a backup's, all or nothing. */
export const replaceData = (sql: Sql, backup: Backup): Promise<void> => {
  return sql.batch(replaceStatements(backup));
};

/** A download of the PC's data: the file's name and text. The PDF report is built on the server, so it is not offered here. */
export const exportFile = async (
  sql: Sql,
  format: 'json' | 'csv',
): Promise<{ fileName: string; type: string; text: string }> => {
  const [backup, { today }] = await Promise.all([readBackup(sql), getProfile(sql)]);

  return {
    fileName: backupFileName(today, format),
    type: format === 'json' ? 'application/json' : 'text/csv',
    text: format === 'json' ? toJson(backup) : toCsv(backup),
  };
};

const refusal = (error: BackupError): string => {
  return backupErrorText(createTranslator({ locale: 'en', messages: en, namespace: 'account.import' }), error);
};

/** The Account tab's changes on the PC: an import replaces the data, and "delete" empties the PC (there is no account). */
export const createAccountChanges = (sql: Sql): AccountChanges => {
  return {
    importBackup: async form => {
      const file = form.get('file');

      if (!(file instanceof File)) {
        return { ok: false, error: refusal({ code: 'notBackup' }) };
      }

      const { name, size } = file;

      if (size > BACKUP_LIMITS.bytes) {
        return { ok: false, error: refusal({ code: 'tooBig', values: { limit: '5 MB' } }) };
      }

      try {
        const { today } = await getProfile(sql);
        const parsed = parseBackup(await file.text(), name, today);

        if (!parsed.ok) {
          return { ok: false, error: refusal(parsed.error) };
        }

        const { backup, summary } = parsed;

        await replaceData(sql, backup);

        return { ok: true, summary };
      } catch (e) {
        return failed(e);
      }
    },

    deleteAccount: async () => {
      try {
        await sql.batch([
          { query: 'delete from habits' },
          { query: 'delete from profile' },
          { query: 'insert into profile (id) values (1)' },
        ]);

        return { ok: true };
      } catch (e) {
        return failed(e);
      }
    },
  };
};
