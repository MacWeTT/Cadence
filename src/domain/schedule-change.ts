import type { CalendarDate, WeekStart } from '@/domain/dates';
import { nextEditDate, scheduleOn } from '@/domain/schedule';
import type { Schedule, Weekday } from '@/domain/types';

export type DesiredSchedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'weekly_count'; timesPerWeek: number }
  | { kind: 'optional' };

/**
 * What to do with a habit's schedule rows after an edit. `upsert` and `delete_pending` both first remove every
 * row with `effectiveFrom > today`, so two edits in one week never leave two pending rows.
 */
export type ScheduleChange =
  | { action: 'none' }
  | { action: 'replace_all'; schedule: Schedule }
  | { action: 'upsert'; schedule: Schedule }
  | { action: 'delete_pending' };

/** What makes two schedules the same: their kind and its parameters (days in any order). */
const signature = (s: Schedule | DesiredSchedule): string => {
  if (s.kind === 'weekly_count') {
    const { timesPerWeek } = s;

    return `weekly_count:${timesPerWeek}`;
  }

  if (s.kind === 'weekdays') {
    const { days } = s;

    return `weekdays:${[...days].sort().join()}`;
  }

  return s.kind;
};

const same = (s: Schedule, d: DesiredSchedule): boolean => {
  return signature(s) === signature(d);
};

const build = (d: DesiredSchedule, effectiveFrom: CalendarDate): Schedule => {
  if (d.kind === 'weekly_count') {
    const { timesPerWeek } = d;

    return { kind: 'weekly_count', timesPerWeek, effectiveFrom };
  }

  if (d.kind === 'weekdays') {
    const { days } = d;

    return { kind: 'weekdays', days: [...days].sort(), effectiveFrom };
  }

  return { kind: d.kind, effectiveFrom };
};

export const planScheduleChange = (input: {
  schedules: Schedule[];
  desired: DesiredSchedule;
  startDate: CalendarDate;
  today: CalendarDate;
  weekStartsOn: WeekStart;
  hasCompletions: boolean;
}): ScheduleChange => {
  const { schedules, desired, startDate, today, weekStartsOn, hasCompletions } = input;

  // No ticks yet means no history to protect: keep a single row from the start date.
  if (!hasCompletions) {
    const only = schedules.length === 1 ? schedules[0] : undefined;

    return only && only.effectiveFrom === startDate && same(only, desired)
      ? { action: 'none' }
      : { action: 'replace_all', schedule: build(desired, startDate) };
  }

  const current = scheduleOn(schedules, today);
  const pending = schedules.filter(s => {
    return s.effectiveFrom > today;
  });
  const effective = nextEditDate(today, weekStartsOn);

  const pendingCount = pending.length;

  if (current && same(current, desired)) {
    return pendingCount > 0 ? { action: 'delete_pending' } : { action: 'none' };
  }

  if (pendingCount === 1 && pending[0].effectiveFrom === effective && same(pending[0], desired)) {
    return { action: 'none' };
  }

  return { action: 'upsert', schedule: build(desired, effective) };
};
