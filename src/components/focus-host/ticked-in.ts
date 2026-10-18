import type { TodayRow, TodayView } from '@/server/today-view';

/** Whether the cache already shows the habit ticked on that day (a tick is idempotent, so a miss is harmless). */
export const tickedIn = (views: [unknown, unknown][], habitId: string): boolean => {
  return views.some(([, data]) => {
    const { view } = (data ?? {}) as { view?: TodayView };
    const { done, optional } = view ?? { done: [], optional: [] };
    const rows: TodayRow[] = [...done, ...optional];

    return rows.some(({ id, ticked }) => {
      return id === habitId && ticked;
    });
  });
};
