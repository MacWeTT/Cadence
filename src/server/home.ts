import 'server-only';
import type { CalendarDate, WeekStart } from '@/domain/dates';
import { loadHabitData } from '@/server/habit-data';
import type { HomeView } from '@/server/home-view';
import { toHomeData } from '@/server/page-data';

/** Everything the Home page shows. `view` and `today` sit at the top so a tick can update it like a Today day. */
export interface HomeData extends HomeView {
  today: CalendarDate;
  name: string | null;
  timezone: string;
  weekStartsOn: WeekStart;
}

export const getHomeData = async (): Promise<HomeData> => {
  return toHomeData(await loadHabitData());
};
