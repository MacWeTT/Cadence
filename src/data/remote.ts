import type { DataSource } from '@/data/types';
import { fetchJson } from '@/lib/query/fetch-json';
import { progressHref } from '@/app/(app)/progress/progress-links';
import type { BackupSummary } from '@/lib/backup-types';
import type { FocusState } from '@/server/focus-view';
import type { HabitsView } from '@/server/habits';
import type { HomeData } from '@/server/home';
import type { ProfileView } from '@/server/profile-view';
import type { ProgressData } from '@/server/progress';
import type { TodayData } from '@/server/today';

/** The web app's data: each read is one of the app's own endpoints. */
export const remote: DataSource = {
  habits: () => {
    return fetchJson<HabitsView>('/api/habits');
  },
  home: () => {
    return fetchJson<HomeData>('/api/home');
  },
  today: date => {
    return fetchJson<TodayData>(date ? `/api/today?date=${date}` : '/api/today');
  },
  progress: (habit, range) => {
    return fetchJson<ProgressData>(`/api${progressHref(habit, range)}`);
  },
  profile: () => {
    return fetchJson<ProfileView>('/api/profile');
  },
  account: () => {
    return fetchJson<BackupSummary>('/api/account');
  },
  focus: () => {
    return fetchJson<FocusState>('/api/focus');
  },
};
