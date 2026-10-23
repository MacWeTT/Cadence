import 'server-only';
import { getFocusTotals } from '@/server/focus';
import type { FocusTotals } from '@/server/focus-view';
import { loadHabitData } from '@/server/habit-data';
import type { HabitRow } from '@/server/habit-view';
import { toProgressData } from '@/server/page-data';
import type { ProgressView } from '@/server/progress-view';

export interface ProgressData {
  /** `null` when there are no habits at all. */
  view: ProgressView | null;
  /** Every habit, for the filter chips. */
  habits: Pick<HabitRow, 'id' | 'icon' | 'name'>[];
  /** Focus time over the same period and habit filter. */
  focus: FocusTotals;
}

export const getProgressData = async (habit: string | undefined, range: string | undefined): Promise<ProgressData> => {
  const loaded = await loadHabitData();
  const { ctx, profile } = loaded;

  return toProgressData(loaded, habit, range, (selected, days) => {
    return getFocusTotals(selected, days, ctx.today, profile.timezone);
  });
};
