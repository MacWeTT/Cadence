import { z } from 'zod';
import { isCalendarDate } from '@/domain/dates';
import { planErrors } from '@/domain/focus';
import { isWeekdaySet } from '@/domain/schedule';
import { fromCsv } from '@/lib/backup-csv';
import {
  BACKUP_LIMITS,
  BACKUP_VERSION,
  type Backup,
  type BackupError,
  type BackupSummary,
  type ParseResult,
} from '@/lib/backup-types';
import { isSingleEmoji, isWebLink } from '@/lib/habit-schema';
import { COLOR_KEYS } from '@/lib/palette';

export const toJson = (backup: Backup): string => {
  return JSON.stringify(backup, null, 2);
};

export const summarize = (backup: Pick<Backup, 'habits'>): BackupSummary => {
  const { habits } = backup;

  return {
    habits: habits.length,
    ticks: habits.reduce((sum, { ticks }) => {
      return sum + ticks.length;
    }, 0),
    focusSessions: habits.reduce((sum, { focusSessions }) => {
      return sum + focusSessions.length;
    }, 0),
  };
};

export const backupFileName = (date: string, extension: 'json' | 'csv' | 'pdf'): string => {
  return `cadence-${date}.${extension}`;
};

const date = z.string().refine(isCalendarDate, 'dateInvalid');
const timestamp = z.string().refine(value => {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}, 'timestampInvalid');

const optional = <T extends z.ZodType>(schema: T) => {
  return schema.nullish().transform(value => {
    return value ?? null;
  });
};

const schedule = z
  .object({
    kind: z.enum(['daily', 'weekdays', 'weekly_count', 'optional'], 'scheduleInvalid'),
    timesPerWeek: optional(z.number()),
    weekdays: optional(z.array(z.number())),
    effectiveFrom: date,
  })
  .superRefine(({ kind, timesPerWeek, weekdays }, context) => {
    const ok =
      kind === 'weekly_count'
        ? weekdays === null && Number.isInteger(timesPerWeek) && (timesPerWeek ?? 0) >= 1 && (timesPerWeek ?? 7) <= 6
        : kind === 'weekdays'
          ? timesPerWeek === null && isWeekdaySet(weekdays)
          : timesPerWeek === null && weekdays === null;

    if (!ok) {
      context.addIssue({ code: 'custom', message: 'scheduleInvalid', path: ['kind'] });
    }
  });

const pause = z.object({ archivedOn: date, restoredOn: optional(date) }).refine(({ archivedOn, restoredOn }) => {
  return restoredOn === null || restoredOn >= archivedOn;
}, 'pauseInvalid');

const focus = z
  .object({
    startedAt: timestamp,
    endedAt: timestamp,
    mode: z.enum(['free', 'pomodoro'], 'focusInvalid'),
    plan: optional(
      z.object({ focusMin: z.number(), breakMin: z.number(), longBreakMin: z.number(), rounds: z.number() }),
    ),
    skippedSeconds: z.number().int().min(0, 'focusInvalid'),
    focusSeconds: z.number().int().min(0, 'focusInvalid'),
  })
  .superRefine(({ startedAt, endedAt, mode, plan }, context) => {
    const planOk = mode === 'free' ? plan === null : plan !== null && planErrors(plan).length === 0;

    if (Date.parse(endedAt) < Date.parse(startedAt) || !planOk) {
      context.addIssue({ code: 'custom', message: 'focusInvalid', path: ['startedAt'] });
    }
  });

/** The rules the database enforces too, so a bad file is refused with its place named before anything is written. */
const habit = (today: string) => {
  return z
    .object({
      name: z.string().trim().min(1, 'nameInvalid').max(80, 'nameInvalid'),
      description: optional(z.string().trim().max(280, 'descriptionInvalid')).transform(value => {
        return value || null;
      }),
      icon: z.string().refine(isSingleEmoji, 'iconInvalid'),
      color: z.enum(COLOR_KEYS, 'colorInvalid'),
      startDate: date,
      createdAt: optional(timestamp),
      links: z
        .array(z.string().refine(isWebLink, 'linkInvalid'))
        .max(10, 'linkInvalid')
        .nullish()
        .transform(value => {
          return value ?? [];
        }),
      archivedAt: optional(timestamp),
      schedules: z.array(schedule).min(1, 'scheduleInvalid'),
      ticks: z.array(date),
      pauses: z
        .array(pause)
        .nullish()
        .transform(value => {
          return value ?? [];
        }),
      focusSessions: z
        .array(focus)
        .nullish()
        .transform(value => {
          return value ?? [];
        }),
    })
    .superRefine(({ startDate, archivedAt, schedules, ticks, pauses }, context) => {
      const fail = (message: string, path: string) => {
        context.addIssue({ code: 'custom', message, path: [path] });
      };

      if (new Set(ticks).size !== ticks.length) {
        fail('tickDuplicate', 'ticks');
      }

      if (
        ticks.some(tick => {
          return tick < startDate;
        })
      ) {
        fail('tickBeforeStart', 'ticks');
      }

      if (
        ticks.some(tick => {
          return tick > today;
        })
      ) {
        fail('tickInFuture', 'ticks');
      }

      if (
        new Set(
          schedules.map(s => {
            return s.effectiveFrom;
          }),
        ).size !== schedules.length
      ) {
        fail('scheduleInvalid', 'schedules');
      }

      const open = pauses.filter(({ restoredOn }) => {
        return restoredOn === null;
      }).length;

      if (open > 1 || (open === 1) !== (archivedAt !== null)) {
        fail('archiveInvalid', 'pauses');
      }
    });
};

const backup = (today: string) => {
  return z.object({
    app: z.literal('cadence'),
    version: z.number(),
    exportedAt: z.string().optional(),
    profile: z
      .object({
        name: z.string().default(''),
        timezone: z.string().default('UTC'),
        weekStartsOn: z
          .union([z.literal(1), z.literal(7)])
          .nullish()
          .transform(value => {
            return value ?? 1;
          }),
      })
      .nullish()
      .transform(value => {
        return value ?? { name: '', timezone: 'UTC', weekStartsOn: 1 as const };
      }),
    habits: z.array(habit(today)),
  });
};

const count = (raw: { habits: unknown[] }, key: 'ticks' | 'focusSessions'): number => {
  return raw.habits.reduce<number>((sum, item) => {
    const list = (item as Record<string, unknown> | null)?.[key];

    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
};

const tooMany = (what: string, found: number, limit: number): ParseResult => {
  return { ok: false, error: { code: 'tooMany', values: { what, count: found, limit } } };
};

const check = (raw: unknown, today: string): ParseResult => {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: { code: 'notBackup' } };
  }

  const { app, version, habits: list } = raw as { app?: unknown; version?: unknown; habits?: unknown };

  if (app !== 'cadence' || typeof version !== 'number' || !Array.isArray(list)) {
    return { ok: false, error: { code: 'notBackup' } };
  }

  if (version > BACKUP_VERSION) {
    return { ok: false, error: { code: 'newerVersion' } };
  }

  const known = list as unknown[];
  const shaped = { habits: known };
  const { habits, ticks, focusSessions } = BACKUP_LIMITS;
  const tickCount = count(shaped, 'ticks');
  const focusCount = count(shaped, 'focusSessions');

  const { length: habitCount } = known;

  if (habitCount > habits) {
    return tooMany('habits', habitCount, habits);
  }

  if (tickCount > ticks) {
    return tooMany('ticks', tickCount, ticks);
  }

  if (focusCount > focusSessions) {
    return tooMany('focusSessions', focusCount, focusSessions);
  }

  const { success, data, error: problem } = backup(today).safeParse(raw);

  if (!success) {
    const [issue] = problem.issues;
    const { path, message } = issue;
    const place = path[0] === 'habits' && typeof path[1] === 'number' ? `habit ${path[1] + 1}` : 'file';
    const error: BackupError = {
      code: 'invalid',
      values: { where: place, field: String(path[2] ?? path[0] ?? ''), reason: message },
    };

    return { ok: false, error };
  }

  const { exportedAt, ...rest } = data;
  const result: Backup = { ...rest, exportedAt: exportedAt ?? '' };

  return { ok: true, backup: result, summary: summarize(result) };
};

/**
 * Reads a backup file. CSV by its name, or by its content when it has no recognised name; anything else is JSON.
 * Nothing is saved: this only says what is in the file, or why it cannot be used. `today` is the account's today, so a
 * check-in after it is refused (the database refuses it too).
 */
export const parseBackup = (text: string, fileName: string, today: string): ParseResult => {
  if (text.length > BACKUP_LIMITS.bytes) {
    return { ok: false, error: { code: 'tooBig', values: { limit: '5 MB' } } };
  }

  const named = /\.(json|csv)$/i.exec(fileName)?.[1]?.toLowerCase();
  const asCsv = named ? named === 'csv' : !/^\s*[{[]/.test(text);

  if (asCsv) {
    const read = fromCsv(text);

    return read.ok ? check(read.raw, today) : read;
  }

  try {
    return check(JSON.parse(text), today);
  } catch {
    return { ok: false, error: { code: 'unreadable' } };
  }
};
