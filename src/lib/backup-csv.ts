import { isCalendarDate } from '@/domain/dates';
import { BACKUP_VERSION, type Backup, type BackupError } from '@/lib/backup-types';
import { escapeFormula, parseCsv, stringifyCsv, unescapeFormula } from '@/lib/csv';

/**
 * A backup as one CSV file with one row per record. The first column says what the row is; the second, for everything
 * that belongs to a habit, is the habit's number in the file (1, 2, 3 in order). Columns a record does not use are empty.
 */
const COLUMNS = [
  'record',
  'habit',
  'name',
  'description',
  'icon',
  'color',
  'start_date',
  'created_at',
  'links',
  'archived_at',
  'effective_from',
  'kind',
  'times_per_week',
  'weekdays',
  'date',
  'archived_on',
  'restored_on',
  'started_at',
  'ended_at',
  'mode',
  'plan',
  'skipped_seconds',
  'focus_seconds',
  'timezone',
  'week_starts_on',
  'version',
  'exported_at',
] as const;

type Column = (typeof COLUMNS)[number];
type Cells = Partial<Record<Column, string | number | null>>;

/** Text columns a person typed: guarded against being run as a spreadsheet formula. */
const TEXT: Column[] = ['name', 'description', 'icon', 'links'];

const text = (value: string | number | null | undefined): string => {
  return value === null || value === undefined ? '' : String(value);
};

const row = (cells: Cells): string[] => {
  return COLUMNS.map(column => {
    const value = text(cells[column]);

    return TEXT.includes(column) ? escapeFormula(value) : value;
  });
};

export const toCsv = (backup: Backup): string => {
  const { exportedAt, profile, habits } = backup;
  const { name: profileName, timezone, weekStartsOn } = profile;
  const rows: string[][] = [
    [...COLUMNS],
    row({ record: 'backup', version: BACKUP_VERSION, exported_at: exportedAt }),
    row({
      record: 'profile',
      name: profileName,
      timezone,
      week_starts_on: weekStartsOn,
    }),
  ];

  habits.forEach((habit, index) => {
    const key = index + 1;
    const { name, description, icon, color, startDate, createdAt, links, archivedAt } = habit;
    const { schedules, ticks, pauses, focusSessions } = habit;

    rows.push(
      row({
        record: 'habit',
        habit: key,
        name,
        description,
        icon,
        color,
        start_date: startDate,
        created_at: createdAt,
        links: links.join(' '),
        archived_at: archivedAt,
      }),
    );

    for (const { kind, timesPerWeek, weekdays, effectiveFrom } of schedules) {
      rows.push(
        row({
          record: 'schedule',
          habit: key,
          effective_from: effectiveFrom,
          kind,
          times_per_week: timesPerWeek,
          weekdays: weekdays?.join(' '),
        }),
      );
    }

    for (const date of ticks) {
      rows.push(row({ record: 'tick', habit: key, date }));
    }

    for (const { archivedOn, restoredOn } of pauses) {
      rows.push(row({ record: 'pause', habit: key, archived_on: archivedOn, restored_on: restoredOn }));
    }

    for (const { startedAt, endedAt, mode, plan, skippedSeconds, focusSeconds } of focusSessions) {
      rows.push(
        row({
          record: 'focus',
          habit: key,
          started_at: startedAt,
          ended_at: endedAt,
          mode,
          plan: plan ? JSON.stringify(plan) : null,
          skipped_seconds: skippedSeconds,
          focus_seconds: focusSeconds,
        }),
      );
    }
  });

  return stringifyCsv(rows);
};

type Raw = Record<string, unknown>;

/** `{ ok: true, raw }` is the same shape JSON has, not yet checked: `parseBackup` checks it. */
export type CsvResult = { ok: true; raw: Raw } | { ok: false; error: BackupError };

const bad = (line: number, reason: string): CsvResult => {
  return { ok: false, error: { code: 'badCsv', values: { row: line, reason } } };
};

const list = (value: string): string[] => {
  return value.split(' ').filter(Boolean);
};

const whole = (value: string): number | null => {
  return value === '' ? null : Number(value);
};

/** The date columns of each record, checked as the file is read so a bad one can name its row. */
const DATES: Record<string, Column[]> = {
  habit: ['start_date'],
  schedule: ['effective_from'],
  tick: ['date'],
  pause: ['archived_on', 'restored_on'],
};

export const fromCsv = (input: string): CsvResult => {
  let rows: string[][];

  try {
    rows = parseCsv(input);
  } catch {
    return { ok: false, error: { code: 'unreadable' } };
  }

  const [header = [], ...body] = rows;
  const index = new Map(
    header.map((name, i) => {
      return [name.trim().toLowerCase(), i] as const;
    }),
  );

  if (!index.has('record') || !index.has('habit')) {
    return { ok: false, error: { code: 'notBackup' } };
  }

  const raw: Raw = { app: 'cadence', version: 1, exportedAt: '', profile: undefined, habits: [] };
  const habits = new Map<string, Raw>();

  for (const [offset, cells] of body.entries()) {
    const line = offset + 2;

    const get = (column: Column): string => {
      const value = cells[index.get(column) ?? -1] ?? '';

      return TEXT.includes(column) ? unescapeFormula(value) : value;
    };

    const record = get('record');

    for (const column of DATES[record] ?? []) {
      const value = get(column);

      if (value !== '' && !isCalendarDate(value)) {
        return { ok: false, error: { code: 'badCsvDate', values: { row: line, value } } };
      }
    }

    if (record === 'backup') {
      raw.version = whole(get('version'));
      raw.exportedAt = get('exported_at');
    } else if (record === 'profile') {
      raw.profile = { name: get('name'), timezone: get('timezone'), weekStartsOn: whole(get('week_starts_on')) };
    } else if (record === 'habit') {
      const habit: Raw = {
        name: get('name'),
        description: get('description') || null,
        icon: get('icon'),
        color: get('color'),
        startDate: get('start_date'),
        createdAt: get('created_at') || null,
        links: list(get('links')),
        archivedAt: get('archived_at') || null,
        schedules: [],
        ticks: [],
        pauses: [],
        focusSessions: [],
      };

      habits.set(get('habit'), habit);
      (raw.habits as Raw[]).push(habit);
    } else if (['schedule', 'tick', 'pause', 'focus'].includes(record)) {
      const habit = habits.get(get('habit'));

      if (!habit) {
        return bad(line, 'habit');
      }

      const lists = habit as Record<'schedules' | 'ticks' | 'pauses' | 'focusSessions', unknown[]>;
      const { schedules, ticks, pauses, focusSessions } = lists;

      if (record === 'schedule') {
        const weekdays = list(get('weekdays')).map(Number);

        schedules.push({
          kind: get('kind'),
          timesPerWeek: whole(get('times_per_week')),
          weekdays: weekdays.length > 0 ? weekdays : null,
          effectiveFrom: get('effective_from'),
        });
      } else if (record === 'tick') {
        ticks.push(get('date'));
      } else if (record === 'pause') {
        pauses.push({ archivedOn: get('archived_on'), restoredOn: get('restored_on') || null });
      } else {
        let plan: unknown = null;

        try {
          plan = get('plan') === '' ? null : JSON.parse(get('plan'));
        } catch {
          return bad(line, 'plan');
        }

        focusSessions.push({
          startedAt: get('started_at'),
          endedAt: get('ended_at'),
          mode: get('mode'),
          plan,
          skippedSeconds: whole(get('skipped_seconds')),
          focusSeconds: whole(get('focus_seconds')),
        });
      }
    } else if (record !== '') {
      return bad(line, 'record');
    }
  }

  return { ok: true, raw };
};
