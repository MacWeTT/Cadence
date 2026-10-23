import { createTranslator } from 'next-intl';
import { isCalendarDate } from '@/domain/dates';
import { planScheduleChange } from '@/domain/schedule-change';
import type { Schedule } from '@/domain/types';
import { getProfile } from '@/data/local/load';
import { insertSchedule, scheduleStatements } from '@/data/local/schedule-sql';
import type { Sql } from '@/data/local/sql';
import type { ActionResult, DataSource } from '@/data/types';
import { formatCalendarDate } from '@/lib/format';
import { habitInputSchema, toFieldErrors, type FieldIssue, type HabitInput } from '@/lib/habit-schema';
import { msg, translateMsg, type Msg, type MessageKey } from '@/lib/message';
import { completionErrorMsg } from '@/server/completion-errors';
import type { ErrorCode } from '@/server/habits';
import { toDesired, toSchedule, type ScheduleRow } from '@/server/habit-view';
import en from '@locales/en';

type Changes = Pick<
  DataSource,
  'createHabit' | 'updateHabit' | 'archiveHabit' | 'restoreHabit' | 'deleteHabit' | 'setCompletion'
>;

/** An expected failure: the message to show, and which fields of the form it is about. */
class ChangeError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly fieldIssues?: Record<string, FieldIssue>,
  ) {
    super(code);
  }
}

const t = createTranslator({ locale: 'en', messages: en });

const describe = (code: ErrorCode, fieldIssues?: Record<string, FieldIssue>): ActionResult => {
  return {
    ok: false,
    error: translateMsg(t, msg(`errors.${code}`)),
    fieldErrors: fieldIssues
      ? Object.fromEntries(
          Object.entries(fieldIssues).map(([field, { code: issue, values }]) => {
            return [field, translateMsg(t, msg(`validation.${issue}` as MessageKey, values))];
          }),
        )
      : undefined,
  };
};

const run = async (work: () => Promise<void>): Promise<ActionResult> => {
  try {
    await work();

    return { ok: true };
  } catch (e) {
    if (e instanceof ChangeError) {
      const { code, fieldIssues } = e;

      return describe(code, fieldIssues);
    }

    console.error(e);

    return describe('saveFailed');
  }
};

interface HabitState {
  start_date: string;
  archived_at: string | null;
}

const stateOf = async (sql: Sql, id: string): Promise<HabitState | undefined> => {
  const [habit] = await sql.select<HabitState>('select start_date, archived_at from habits where id = ?', [id]);

  return habit;
};

/** The changes of the desktop data source on the local file, with the rules the server's database functions keep. */
export const createChanges = (sql: Sql): Changes => {
  const parseInput = async (input: unknown): Promise<{ data: HabitInput; today: string; weekStartsOn: 1 | 7 }> => {
    const { today, weekStartsOn } = await getProfile(sql);
    const { success, data, error } = habitInputSchema(today).safeParse(input);

    if (!success) {
      throw new ChangeError('fixFields', toFieldErrors(error));
    }

    return { data, today, weekStartsOn };
  };

  return {
    createHabit: input => {
      return run(async () => {
        const { data } = await parseInput(input);
        const { name, description, icon, color, startDate, links } = data;
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await sql.batch([
          {
            query:
              'insert into habits (id, name, description, icon, color, start_date, links, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            params: [id, name, description || null, icon, color, startDate, JSON.stringify(links), now, now],
          },
          insertSchedule(id, { ...toDesired(data), effectiveFrom: startDate } as Schedule),
        ]);
      });
    },
    updateHabit: (id, input) => {
      return run(async () => {
        const { data, today, weekStartsOn } = await parseInput(input);
        const { name, description, icon, color, startDate, links } = data;
        const habit = await stateOf(sql, id);

        if (!habit) {
          throw new ChangeError('habitNotFound');
        }

        if (habit.archived_at) {
          throw new ChangeError('editArchived');
        }

        const [first] = await sql.select<{ completion_date: string }>(
          'select completion_date from habit_completions where habit_id = ? order by completion_date limit 1',
          [id],
        );
        const firstTick = first?.completion_date;

        if (firstTick && startDate > firstTick) {
          throw new ChangeError('checkStartDate', {
            startDate: { code: 'startAfterFirstTick', values: { date: formatCalendarDate(firstTick) } },
          });
        }

        const rows = await sql.select<Omit<ScheduleRow, 'weekdays'> & { weekdays: string | null }>(
          'select * from habit_schedules where habit_id = ?',
          [id],
        );
        const plan = planScheduleChange({
          schedules: rows.map(({ weekdays, ...row }) => {
            return toSchedule({ ...row, weekdays: weekdays ? (JSON.parse(weekdays) as number[]) : null });
          }),
          desired: toDesired(data),
          startDate,
          today,
          weekStartsOn,
          hasCompletions: firstTick !== undefined,
        });

        await sql.batch([
          {
            query:
              'update habits set name = ?, description = ?, icon = ?, color = ?, start_date = ?, links = ?, updated_at = ? where id = ?',
            params: [
              name,
              description || null,
              icon,
              color,
              startDate,
              JSON.stringify(links),
              new Date().toISOString(),
              id,
            ],
          },
          ...scheduleStatements(id, plan, today),
        ]);
      });
    },
    archiveHabit: id => {
      return run(async () => {
        const { today } = await getProfile(sql);
        const habit = await stateOf(sql, id);

        if (!habit || habit.archived_at) {
          throw new ChangeError('habitChanged');
        }

        const now = new Date().toISOString();

        await sql.batch([
          { query: 'update habits set archived_at = ?, updated_at = ? where id = ?', params: [now, now, id] },
          {
            query: 'insert into habit_archive_periods (id, habit_id, archived_on) values (?, ?, ?)',
            params: [crypto.randomUUID(), id, today],
          },
        ]);
      });
    },
    restoreHabit: id => {
      return run(async () => {
        const { today } = await getProfile(sql);
        const habit = await stateOf(sql, id);

        if (!habit?.archived_at) {
          throw new ChangeError('habitChanged');
        }

        await sql.batch([
          {
            query: 'update habits set archived_at = null, updated_at = ? where id = ?',
            params: [new Date().toISOString(), id],
          },
          {
            query:
              'update habit_archive_periods set restored_on = max(?, archived_on) where habit_id = ? and restored_on is null',
            params: [today, id],
          },
        ]);
      });
    },
    deleteHabit: id => {
      return run(async () => {
        const habit = await stateOf(sql, id);

        if (!habit) {
          throw new ChangeError('habitNotFound');
        }

        const { archived_at } = habit;

        if (!archived_at) {
          throw new ChangeError('deleteNeedsArchive');
        }

        await sql.batch([{ query: 'delete from habits where id = ?', params: [id] }]);
      });
    },
    setCompletion: async (habitId, date, done) => {
      if (!isCalendarDate(date) || typeof done !== 'boolean') {
        return describe('saveFailed');
      }

      try {
        const { today } = await getProfile(sql);
        const habit = await stateOf(sql, habitId);
        const { archived_at, start_date } = habit ?? { archived_at: null, start_date: '' };
        const refusal = !habit
          ? 'habit_not_found'
          : archived_at
            ? 'habit_archived'
            : date > today
              ? 'date_in_future'
              : date < start_date
                ? 'before_start'
                : null;

        if (refusal) {
          return { ok: false, error: translateMsg(t, completionErrorMsg(refusal) as Msg) };
        }

        await sql.batch([
          done
            ? {
                query:
                  'insert into habit_completions (id, habit_id, completion_date, created_at) values (?, ?, ?, ?) on conflict (habit_id, completion_date) do nothing',
                params: [crypto.randomUUID(), habitId, date, new Date().toISOString()],
              }
            : {
                query: 'delete from habit_completions where habit_id = ? and completion_date = ?',
                params: [habitId, date],
              },
        ]);

        return { ok: true };
      } catch (e) {
        console.error(e);

        return describe('saveFailed');
      }
    },
  };
};
