import { z } from 'zod';
import { toCalendarDate } from '@/domain/dates';
import { activeSeconds, breakLeftAt, isSavedSession, planErrors } from '@/domain/focus';
import { getProfile } from '@/data/local/load';
import { ChangeError, describe, failed } from '@/data/local/outcome';
import type { Sql } from '@/data/local/sql';
import type { DataSource, FocusActionResult } from '@/data/types';
import { isChimeId } from '@/lib/chimes';
import { startSchema } from '@/lib/focus-schema';
import type { FocusResult } from '@/server/focus';
import { parsePlan, settle, type FocusRow } from '@/server/focus-view';

type FocusChanges = Pick<
  DataSource,
  'startFocus' | 'stopFocus' | 'skipBreak' | 'pauseFocus' | 'resumeFocus' | 'discardFocus'
>;

/** The running session as the focus rules read it (the plan's JSON opened up). */
const runningRow = async (sql: Sql): Promise<FocusRow | null> => {
  const [row] = await sql.select<Omit<FocusRow, 'plan'> & { plan: string | null }>(
    'select * from focus_sessions where ended_at is null',
  );

  if (!row) {
    return null;
  }

  const { plan } = row;

  return { ...row, plan: plan === null ? null : JSON.parse(plan) };
};

/** Saves a settled session, or drops it when it was under a minute. */
const closeRow = async (sql: Sql, row: FocusRow, now: Date): Promise<{ focusSeconds: number; saved: boolean }> => {
  const { id } = row;
  const { endedAt, focusSeconds } = settle(row, now);

  if (!isSavedSession(focusSeconds)) {
    await sql.batch([{ query: 'delete from focus_sessions where id = ? and ended_at is null', params: [id] }]);

    return { focusSeconds, saved: false };
  }

  await sql.batch([
    {
      query:
        'update focus_sessions set ended_at = ?, focus_seconds = ?, paused_at = null where id = ? and ended_at is null',
      params: [endedAt, focusSeconds, id],
    },
  ]);

  return { focusSeconds, saved: true };
};

/** The focus timer's changes on the local file. The device's clock stands in for the server's `server_now`. */
export const createFocusChanges = (sql: Sql): FocusChanges => {
  const run = async (work: () => Promise<FocusResult | null>): Promise<FocusActionResult> => {
    try {
      return { ok: true, result: await work() };
    } catch (e) {
      return failed(e);
    }
  };

  return {
    startFocus: async input => {
      const { success, data } = startSchema.safeParse(input);

      if (!success) {
        return describe('focusPlanInvalid');
      }

      const { habitId, mode, plan, soundId } = data;

      return run(async () => {
        if (mode === 'pomodoro' && (!plan || planErrors(plan).length > 0)) {
          throw new ChangeError('focusPlanInvalid');
        }

        // shortcut: only the built-in sounds exist on the PC until custom sounds are stored locally.
        if (soundId !== null && !isChimeId(soundId)) {
          throw new ChangeError('focusSoundInvalid');
        }

        const [habit] = await sql.select<{ archived_at: string | null }>(
          'select archived_at from habits where id = ?',
          [habitId],
        );

        if (!habit || habit.archived_at) {
          throw new ChangeError('habitNotFound');
        }

        const now = new Date();
        const running = await runningRow(sql);

        if (running) {
          if (!settle(running, now).expired) {
            throw new ChangeError('focusRunning');
          }

          await closeRow(sql, running, now);
        }

        await sql.batch([
          {
            query:
              'insert into focus_sessions (id, habit_id, started_at, mode, plan, sound_id) values (?, ?, ?, ?, ?, ?)',
            params: [
              crypto.randomUUID(),
              habitId,
              now.toISOString(),
              mode,
              mode === 'pomodoro' ? JSON.stringify(plan) : null,
              soundId,
            ],
          },
        ]);

        return null;
      });
    },

    stopFocus: () => {
      return run(async () => {
        const row = await runningRow(sql);

        if (!row) {
          return null;
        }

        const { timezone } = await getProfile(sql);
        const { focusSeconds, saved } = await closeRow(sql, row, new Date());
        const { id, habit_id, started_at } = row;

        return { sessionId: id, habitId: habit_id, focusSeconds, date: toCalendarDate(started_at, timezone), saved };
      });
    },

    discardFocus: input => {
      const { success, data } = z.uuid().safeParse(input);

      if (!success) {
        return Promise.resolve(describe('saveFailed'));
      }

      return run(async () => {
        await sql.batch([
          { query: 'delete from focus_sessions where id = ? and ended_at is not null', params: [data] },
        ]);

        return null;
      });
    },

    skipBreak: () => {
      return run(async () => {
        const row = await runningRow(sql);
        const plan = row?.mode === 'pomodoro' ? parsePlan(row.plan) : null;

        if (!row || !plan) {
          return null;
        }

        const { id, started_at, skipped_seconds, paused_at, paused_seconds } = row;

        if (paused_at) {
          return null;
        }

        const elapsed = activeSeconds(started_at, paused_seconds, null, Date.now()) + skipped_seconds;
        const left = breakLeftAt(plan, elapsed);

        if (left > 0) {
          await sql.batch([
            {
              query: 'update focus_sessions set skipped_seconds = ? where id = ?',
              params: [skipped_seconds + left, id],
            },
          ]);
        }

        return null;
      });
    },

    pauseFocus: () => {
      return run(async () => {
        const row = await runningRow(sql);
        const now = new Date();

        if (!row) {
          return null;
        }

        const { id, paused_at } = row;

        if (paused_at || settle(row, now).expired) {
          return null;
        }

        await sql.batch([
          { query: 'update focus_sessions set paused_at = ? where id = ?', params: [now.toISOString(), id] },
        ]);

        return null;
      });
    },

    resumeFocus: () => {
      return run(async () => {
        const row = await runningRow(sql);

        if (!row?.paused_at) {
          return null;
        }

        const { id, paused_at, paused_seconds } = row;
        const pause = Math.max(0, Math.floor((Date.now() - new Date(paused_at).getTime()) / 1000));

        await sql.batch([
          {
            query: 'update focus_sessions set paused_at = null, paused_seconds = ? where id = ?',
            params: [paused_seconds + pause, id],
          },
        ]);

        return null;
      });
    },
  };
};
