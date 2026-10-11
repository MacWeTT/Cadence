import type { DesiredSchedule } from '@/domain/schedule-change';
import { sameSchedule } from '@/domain/schedule-change';
import type { Schedule } from '@/domain/types';
import type { ColorKey } from '@/lib/palette';
import { toDesired, type HabitListItem } from '@/server/habit-view';
import type { ScheduleKind } from '@/app/(app)/habits/schedule-field/schedule-field';

const DEFAULT_ICON = '🎯';
/** A new fixed-days habit starts with the working week ticked. */
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];

/** Everything the habit form edits, kept in one object so one handler can update any field. */
export interface HabitFormState {
  icon: string;
  name: string;
  description: string;
  color: ColorKey;
  kind: ScheduleKind;
  timesPerWeek: string;
  /** For fixed days: 1 = Monday ... 7 = Sunday. */
  weekdays: number[];
  /** One entry per row in the form; blank rows are dropped when saving. */
  links: string[];
  startDate: string;
  fieldErrors: Record<string, string>;
  formError: string | null;
}

const timesOf = (schedule: Schedule | undefined): string => {
  return schedule?.kind === 'weekly_count' ? String(schedule.timesPerWeek) : '3';
};

const daysOf = (schedule: Schedule | undefined): number[] => {
  return schedule?.kind === 'weekdays' ? schedule.days : DEFAULT_WEEKDAYS;
};

/** The form's first values: the habit being edited, or the defaults for a new one. */
export const initialHabitForm = (habit: HabitListItem | undefined, today: string): HabitFormState => {
  // When a schedule change is already pending, the form starts from it so the user sees what they set.
  const shown = habit?.pendingSchedule ?? habit?.schedule;

  return {
    icon: habit?.icon ?? DEFAULT_ICON,
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    color: habit?.color ?? 'moss',
    kind: shown?.kind ?? 'daily',
    timesPerWeek: timesOf(shown),
    weekdays: daysOf(shown),
    links: habit?.links ?? [],
    startDate: habit?.startDate ?? today,
    fieldErrors: {},
    formError: null,
  };
};

/** The schedule part of what the form sends to the server. */
export const scheduleInput = (form: HabitFormState) => {
  const { kind, timesPerWeek, weekdays } = form;

  return {
    kind,
    timesPerWeek: kind === 'weekly_count' ? Number(timesPerWeek) : undefined,
    weekdays: kind === 'weekdays' ? weekdays : undefined,
  };
};

/** Everything the form sends to the server. */
export const habitInput = (form: HabitFormState) => {
  const { name, description, icon, color, links, startDate } = form;

  return {
    name,
    description: description || undefined,
    icon,
    color,
    ...scheduleInput(form),
    links: links
      .map(link => {
        return link.trim();
      })
      .filter(Boolean),
    startDate,
  };
};

/** The schedule the form asks for, as the domain understands it. */
export const desiredSchedule = (form: HabitFormState): DesiredSchedule => {
  return toDesired(scheduleInput(form));
};

/** True when the form's schedule differs from the one the habit has now. */
export const scheduleChanged = (habit: HabitListItem | undefined, form: HabitFormState): boolean => {
  return habit !== undefined && !sameSchedule(habit.schedule, desiredSchedule(form));
};
