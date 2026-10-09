import type { CalendarDate, WeekStart } from './dates';
import { nextEditDate, scheduleOn } from './schedule';
import type { Schedule } from './types';

export type DesiredSchedule = { kind: 'daily' } | { kind: 'weekly_count'; timesPerWeek: number };

/**
 * What to do with a habit's schedule rows after an edit. `upsert` and `delete_pending` both first remove every
 * row with `effectiveFrom > today`, so two edits in one week never leave two pending rows.
 */
export type ScheduleChange =
  | { action: 'none' }
  | { action: 'replace_all'; schedule: Schedule }
  | { action: 'upsert'; schedule: Schedule }
  | { action: 'delete_pending' };

const same = (s: Schedule, d: DesiredSchedule): boolean =>
  s.kind === d.kind && (s.kind === 'daily' || (d.kind === 'weekly_count' && s.timesPerWeek === d.timesPerWeek));

const build = (d: DesiredSchedule, effectiveFrom: CalendarDate): Schedule =>
  d.kind === 'daily' ? { kind: 'daily', effectiveFrom } : { kind: 'weekly_count', timesPerWeek: d.timesPerWeek, effectiveFrom };

export function planScheduleChange(input: {
  schedules: Schedule[];
  desired: DesiredSchedule;
  startDate: CalendarDate;
  today: CalendarDate;
  weekStartsOn: WeekStart;
  hasCompletions: boolean;
}): ScheduleChange {
  const { schedules, desired, startDate, today, weekStartsOn, hasCompletions } = input;

  // No ticks yet means no history to protect: keep a single row from the start date.
  if (!hasCompletions) {
    const only = schedules.length === 1 ? schedules[0] : undefined;
    return only && only.effectiveFrom === startDate && same(only, desired)
      ? { action: 'none' }
      : { action: 'replace_all', schedule: build(desired, startDate) };
  }

  const current = scheduleOn(schedules, today);
  const pending = schedules.filter((s) => s.effectiveFrom > today);
  const effective = nextEditDate(today, weekStartsOn);

  if (current && same(current, desired)) return pending.length > 0 ? { action: 'delete_pending' } : { action: 'none' };
  if (pending.length === 1 && pending[0].effectiveFrom === effective && same(pending[0], desired)) return { action: 'none' };
  return { action: 'upsert', schedule: build(desired, effective) };
}
