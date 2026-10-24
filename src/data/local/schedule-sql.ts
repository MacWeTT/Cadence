import { planScheduleChange } from '@/domain/schedule-change';
import type { Schedule } from '@/domain/types';
import type { Statement } from '@/data/local/sql';

export const insertSchedule = (habitId: string, schedule: Schedule): Statement => {
  const {
    kind,
    effectiveFrom,
    timesPerWeek = null,
    days,
  } = schedule as Schedule & {
    timesPerWeek?: number;
    days?: number[];
  };
  const weekdays = days ? JSON.stringify(days) : null;

  return {
    query:
      'insert into habit_schedules (id, habit_id, kind, times_per_week, weekdays, effective_from) values (?, ?, ?, ?, ?, ?)',
    params: [crypto.randomUUID(), habitId, kind, timesPerWeek, weekdays, effectiveFrom],
  };
};

/** The statements that do what the server's `apply_schedule_change` does for a plan. */
export const scheduleStatements = (
  habitId: string,
  plan: ReturnType<typeof planScheduleChange>,
  today: string,
): Statement[] => {
  if (plan.action === 'none') {
    return [];
  }

  if (plan.action === 'delete_pending') {
    return [
      { query: 'delete from habit_schedules where habit_id = ? and effective_from > ?', params: [habitId, today] },
    ];
  }

  const { schedule } = plan;
  const { effectiveFrom } = schedule;

  if (plan.action === 'replace_all') {
    return [
      { query: 'delete from habit_schedules where habit_id = ?', params: [habitId] },
      insertSchedule(habitId, schedule),
    ];
  }

  return [
    {
      query: 'delete from habit_schedules where habit_id = ? and effective_from > ? and effective_from <> ?',
      params: [habitId, today, effectiveFrom],
    },
    {
      query: 'delete from habit_schedules where habit_id = ? and effective_from = ?',
      params: [habitId, effectiveFrom],
    },
    insertSchedule(habitId, schedule),
  ];
};
