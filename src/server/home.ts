import 'server-only';
import type { CalendarDate, WeekStart } from '@/domain/dates';
import { loadHabitData } from '@/server/habit-data';
import { buildHomeView, type HomeView } from '@/server/home-view';

/** Everything the Home page shows. `view` and `today` sit at the top so a tick can update it like a Today day. */
export interface HomeData extends HomeView {
  today: CalendarDate;
  name: string | null;
  timezone: string;
  weekStartsOn: WeekStart;
}

export const getHomeData = async (): Promise<HomeData> => {
  const { entries, ctx, profile } = await loadHabitData();
  const { today, weekStartsOn } = ctx;
  const { displayName, timezone } = profile;

  return { ...buildHomeView(entries, ctx), today, name: displayName, timezone, weekStartsOn };
};
