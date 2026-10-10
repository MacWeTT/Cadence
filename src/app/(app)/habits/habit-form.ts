import type { ColorKey } from '@/lib/palette';
import type { HabitListItem } from '@/server/habit-view';
import type { ScheduleKind } from './schedule-field/schedule-field';

const DEFAULT_ICON = '🎯';

/** Everything the habit form edits, kept in one object so one handler can update any field. */
export interface HabitFormState {
  icon: string;
  name: string;
  description: string;
  color: ColorKey;
  kind: ScheduleKind;
  timesPerWeek: string;
  startDate: string;
  fieldErrors: Record<string, string>;
  formError: string | null;
}

/** The form's first values: the habit being edited, or the defaults for a new one. */
export const initialHabitForm = (habit: HabitListItem | undefined, today: string): HabitFormState => {
  // When a schedule change is already pending, the form starts from it so the user sees what they set.
  const shown = habit ? (habit.pendingSchedule ?? habit.schedule) : undefined;

  return {
    icon: habit?.icon ?? DEFAULT_ICON,
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    color: habit?.color ?? 'moss',
    kind: shown?.kind ?? 'daily',
    timesPerWeek: shown?.kind === 'weekly_count' ? String(shown.timesPerWeek) : '3',
    startDate: habit?.startDate ?? today,
    fieldErrors: {},
    formError: null,
  };
};
