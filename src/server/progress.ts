import 'server-only';
import { getFocusTotals } from '@/server/focus';
import type { FocusTotals } from '@/server/focus-view';
import { loadHabitData } from '@/server/habit-data';
import type { HabitRow } from '@/server/habit-view';
import { buildProgress, parseRange, type ProgressView } from '@/server/progress-view';

export interface ProgressData {
  /** `null` when there are no habits at all. */
  view: ProgressView | null;
  /** Every habit, for the filter chips. */
  habits: Pick<HabitRow, 'id' | 'icon' | 'name'>[];
  /** Focus time over the same period and habit filter. */
  focus: FocusTotals;
}

export const getProgressData = async (habit: string | undefined, range: string | undefined): Promise<ProgressData> => {
  const { entries, ctx, profile } = await loadHabitData();

  if (entries.length === 0) {
    return { view: null, habits: [], focus: { totalSeconds: 0, byHabit: [] } };
  }

  const days = parseRange(range);
  const selected = entries.find(({ habit: { id } }) => {
    return id === habit;
  })?.habit.id;

  return {
    view: buildProgress(entries, habit, days, ctx),
    focus: await getFocusTotals(selected ?? null, days, ctx.today, profile.timezone),
    habits: entries.map(({ habit: { id, icon, name } }) => {
      return { id, icon, name };
    }),
  };
};
