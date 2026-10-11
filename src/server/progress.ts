import 'server-only';
import { loadHabitData } from '@/server/habit-data';
import type { HabitRow } from '@/server/habit-view';
import { buildProgress, parseRange, type ProgressView } from '@/server/progress-view';

export interface ProgressData {
  /** `null` when there are no habits at all. */
  view: ProgressView | null;
  /** Every habit, for the filter chips. */
  habits: Pick<HabitRow, 'id' | 'icon' | 'name'>[];
}

export const getProgressData = async (habit: string | undefined, range: string | undefined): Promise<ProgressData> => {
  const { entries, ctx } = await loadHabitData();

  if (entries.length === 0) {
    return { view: null, habits: [] };
  }

  return {
    view: buildProgress(entries, habit, parseRange(range), ctx),
    habits: entries.map(({ habit: { id, icon, name } }) => {
      return { id, icon, name };
    }),
  };
};
