import { addDays } from '@/domain/dates';
import { loadHabits } from '@/data/local/load';
import type { Sql } from '@/data/local/sql';
import type { DataSource } from '@/data/types';
import {
  focusByHabit,
  lastSoundsOf,
  parsePlan,
  toSession,
  type FocusRow,
  type FocusState,
  type FocusTotals,
} from '@/server/focus-view';
import { toListItem } from '@/server/habit-view';
import { toHomeData, toProgressData, toTodayData } from '@/server/page-data';
import { toProfileView, type ProfileRow } from '@/server/profile-view';

type Reads = Pick<DataSource, 'habits' | 'home' | 'today' | 'progress' | 'profile' | 'account' | 'focus'>;

/** How many recent sessions are read to find the numbers and the sound last used on each habit. */
const RECENT_SESSIONS = 200;

interface FocusSqlRow extends Omit<FocusRow, 'plan'> {
  plan: string | null;
  h_name: string;
  h_icon: string;
  h_color: string;
}

const parseJson = (text: string | null): unknown => {
  return text === null ? null : JSON.parse(text);
};

/** A running session row (joined with its habit) as the focus state carries it. */
const sessionOf = ({ h_name, h_icon, h_color, plan, ...row }: FocusSqlRow) => {
  return toSession({ ...row, plan: parseJson(plan) }, { name: h_name, icon: h_icon, color: h_color });
};

/** The reads of the desktop data source: the same pages as the server's, built from the local file. */
export const createReads = (sql: Sql): Reads => {
  const focusTotals = async (
    habit: string | null,
    days: number,
    today: string,
    timeZone: string,
  ): Promise<FocusTotals> => {
    const from = addDays(today, 1 - days);
    // a day's start can be up to a day off UTC, so read a day wider and let the pure step place each session
    const since = new Date(`${addDays(from, -1)}T00:00:00Z`).toISOString();
    const rows = await sql.select<{ habit_id: string; started_at: string; focus_seconds: number | null }>(
      `select habit_id, started_at, focus_seconds from focus_sessions
       where ended_at is not null and started_at >= ?${habit ? ' and habit_id = ?' : ''} order by started_at, id`,
      habit ? [since, habit] : [since],
    );

    return focusByHabit(
      rows.map(({ habit_id, started_at, focus_seconds }) => {
        return { habitId: habit_id, startedAt: started_at, focusSeconds: focus_seconds ?? 0 };
      }),
      from,
      today,
      timeZone,
    );
  };

  return {
    habits: async () => {
      const { rows, profile } = await loadHabits(sql);
      const { habits, schedules, ticks } = rows;
      const items = habits.map(habit => {
        const { id } = habit;

        return toListItem(
          habit,
          schedules.filter(({ habit_id }) => {
            return habit_id === id;
          }),
          ticks.has(id),
          profile.today,
        );
      });

      return {
        active: items.filter(({ archivedAt }) => {
          return !archivedAt;
        }),
        archived: items.filter(({ archivedAt }) => {
          return archivedAt;
        }),
        profile,
      };
    },

    home: async () => {
      return toHomeData(await loadHabits(sql));
    },

    today: async date => {
      return toTodayData(await loadHabits(sql), date);
    },

    progress: async (habit, range) => {
      const loaded = await loadHabits(sql);
      const { ctx, profile } = loaded;

      return toProgressData(loaded, habit ?? undefined, String(range), (selected, days) => {
        return focusTotals(selected, days, ctx.today, profile.timezone);
      });
    },

    profile: async () => {
      const [row] = await sql.select<Omit<ProfileRow, 'password_set'> & { password_set: number }>(
        'select * from profile where id = 1',
      );

      return toProfileView({ row: { ...row, password_set: row.password_set === 1 }, email: '', sounds: [], urls: {} });
    },

    account: async () => {
      const [counts] = await sql.select<{ habits: number; ticks: number; focusSessions: number }>(
        `select (select count(*) from habits) as habits,
                (select count(*) from habit_completions) as ticks,
                (select count(*) from focus_sessions) as focusSessions`,
      );

      return counts;
    },

    focus: async (): Promise<FocusState> => {
      const [running] = await sql.select<FocusSqlRow>(
        `select s.*, h.name as h_name, h.icon as h_icon, h.color as h_color
         from focus_sessions s join habits h on h.id = s.habit_id where s.ended_at is null`,
      );
      const [planRows, soundRows] = await Promise.all([
        sql.select<{ habit_id: string; plan: string }>(
          `select habit_id, plan from focus_sessions where mode = 'pomodoro' and plan is not null
           order by started_at desc limit ${RECENT_SESSIONS}`,
        ),
        sql.select<{ habit_id: string; sound_id: string | null }>(
          `select habit_id, sound_id from focus_sessions order by started_at desc limit ${RECENT_SESSIONS}`,
        ),
      ]);
      const plans: FocusState['plans'] = {};

      for (const { habit_id, plan } of planRows) {
        const parsed = parsePlan(parseJson(plan));

        if (parsed && !(habit_id in plans)) {
          plans[habit_id] = parsed;
        }
      }

      return {
        running: running ? sessionOf(running) : null,
        serverNow: new Date().toISOString(),
        plans,
        sounds: lastSoundsOf(soundRows),
      };
    },
  };
};
