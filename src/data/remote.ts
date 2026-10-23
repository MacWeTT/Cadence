import {
  archiveHabitAction,
  createHabitAction,
  deleteHabitAction,
  restoreHabitAction,
  updateHabitAction,
} from '@/app/(app)/habits/actions';
import { setCompletionAction } from '@/app/(app)/today/actions';
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

/** The web app's data: each read is one of the app's own endpoints, each change a Server Action. */
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
  createHabit: input => {
    return createHabitAction(input);
  },
  updateHabit: (id, input) => {
    return updateHabitAction(id, input);
  },
  archiveHabit: id => {
    return archiveHabitAction(id);
  },
  restoreHabit: id => {
    return restoreHabitAction(id);
  },
  deleteHabit: id => {
    return deleteHabitAction(id);
  },
  setCompletion: (habitId, date, done) => {
    return setCompletionAction(habitId, date, done);
  },
};
