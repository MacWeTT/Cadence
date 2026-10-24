import type { Cloud } from '@/data/local/auth';
import { Rejected, type RemoteFocus, type RemoteHabit, type StepPort } from '@/data/local/step-types';
import type { AccountSettings } from '@/data/local/sync';
import type { Json } from '@/lib/supabase/database.types';
import { fetchAll } from '@/server/fetch-all';

const COLUMNS = 'display_name, tag, timezone, week_starts_on, sound_id, sound_volume, accent, accent_custom';

/**
 * What the account says for good, as opposed to what a bad connection says: the record named is gone or not the person's
 * (our functions raise P0001), a value the database refuses (22 and 23 classes), or a tag that is taken.
 */
const settle = (error: { code?: string; message: string } | null): void => {
  if (!error) {
    return;
  }

  const { code, message } = error;

  if (code === 'P0001' || code?.startsWith('22') || code?.startsWith('23') || code === '42501') {
    throw new Rejected(message);
  }

  throw error;
};

/** The account through the person's own Supabase session: row-level security limits every call to their rows. */
export const cloudStep = (cloud: Cloud): StepPort => {
  const userId = async (): Promise<string> => {
    const { data } = await cloud.auth.getSession();
    const id = data.session?.user.id;

    if (!id) {
      throw new Error('Not signed in.');
    }

    return id;
  };

  return {
    putHabit: async habit => {
      const { error } = await cloud.rpc('sync_put_habit', { p_habit: habit as unknown as Json });

      settle(error);
    },
    deleteHabit: async id => {
      const { error } = await cloud.rpc('sync_delete_habit', { p_id: id });

      settle(error);
    },
    setTick: async (habitId, date, done, today) => {
      const { error } = await cloud.rpc('set_completion', {
        p_habit_id: habitId,
        p_date: date,
        p_done: done,
        p_today: today,
      });

      settle(error);
    },
    putFocus: async session => {
      const {
        id,
        habit_id,
        started_at,
        ended_at,
        mode,
        plan,
        skipped_seconds,
        paused_seconds,
        focus_seconds,
        sound_id,
      } = session;
      const { error } = await cloud.rpc('sync_put_focus', {
        p_session: {
          id,
          habitId: habit_id,
          startedAt: started_at,
          endedAt: ended_at,
          mode,
          plan,
          skippedSeconds: skipped_seconds,
          pausedSeconds: paused_seconds,
          focusSeconds: focus_seconds,
          soundId: sound_id,
        } as Json,
      });

      settle(error);
    },
    deleteFocus: async id => {
      const { error } = await cloud.rpc('sync_delete_focus', { p_id: id });

      settle(error);
    },
    saveSettings: async patch => {
      const { error } = await cloud
        .from('profiles')
        .update(patch)
        .eq('user_id', await userId());

      settle(error);
    },
    readState: async () => {
      const id = await userId();
      const [habits, schedules, pauses, ticks, focus, { data: settings, error }] = await Promise.all([
        fetchAll((from, to) => {
          return cloud
            .from('habits')
            .select('id, name, description, icon, color, start_date, links, created_at, updated_at, archived_at')
            .order('created_at')
            .order('id')
            .range(from, to);
        }),
        fetchAll((from, to) => {
          return cloud
            .from('habit_schedules')
            .select('habit_id, kind, times_per_week, weekdays, effective_from')
            .order('habit_id')
            .order('effective_from')
            .range(from, to);
        }),
        fetchAll((from, to) => {
          return cloud
            .from('habit_archive_periods')
            .select('habit_id, archived_on, restored_on')
            .order('habit_id')
            .order('archived_on')
            .range(from, to);
        }),
        fetchAll((from, to) => {
          return cloud
            .from('habit_completions')
            .select('habit_id, completion_date')
            .order('habit_id')
            .order('completion_date')
            .range(from, to);
        }),
        fetchAll((from, to) => {
          return cloud
            .from('focus_sessions')
            .select(
              'id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, paused_seconds, focus_seconds, sound_id',
            )
            .not('ended_at', 'is', null)
            .order('id')
            .range(from, to);
        }),
        cloud.from('profiles').select(COLUMNS).eq('user_id', id).single(),
      ]);

      if (error) {
        throw error;
      }

      return {
        habits: habits.map((habit): RemoteHabit => {
          const { id: habitId } = habit;

          return {
            ...habit,
            schedules: schedules
              .filter(({ habit_id }) => {
                return habit_id === habitId;
              })
              .map(({ kind, times_per_week, weekdays, effective_from }) => {
                return { kind, times_per_week, weekdays, effective_from };
              }),
            pauses: pauses
              .filter(({ habit_id }) => {
                return habit_id === habitId;
              })
              .map(({ archived_on, restored_on }) => {
                return { archived_on, restored_on };
              }),
          };
        }),
        ticks,
        focus: focus as RemoteFocus[],
        settings: settings as AccountSettings,
      };
    },
  };
};
