import {
  archiveHabitAction,
  createHabitAction,
  deleteHabitAction,
  restoreHabitAction,
  updateHabitAction,
} from '@/app/(app)/habits/actions';
import { sendContactAction } from '@/app/(app)/contact/actions';
import { syncTimezoneAction } from '@/app/(app)/timezone-actions';
import { signInAction, signUpAction } from '@/app/(auth)/login/actions';
import { registerAction } from '@/app/(auth)/register/actions';
import { signOut } from '@/app/auth/actions';
import {
  removeSoundAction,
  setPasswordAction,
  updateAccentAction,
  updateAvatarAction,
  updateNameAction,
  updateSoundAction,
  updateTagAction,
  updateTimezoneAction,
  updateWeekStartAction,
  uploadAvatarPhotoAction,
  uploadSoundAction,
} from '@/app/(app)/profile/actions';
import { deleteAccountAction, importBackupAction } from '@/app/(app)/profile/account/actions';
import {
  discardFocusAction,
  pauseFocusAction,
  resumeFocusAction,
  skipBreakAction,
  startFocusAction,
  stopFocusAction,
} from '@/app/(app)/focus-actions';
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
  startFocus: input => {
    return startFocusAction(input);
  },
  stopFocus: () => {
    return stopFocusAction();
  },
  skipBreak: () => {
    return skipBreakAction();
  },
  pauseFocus: () => {
    return pauseFocusAction();
  },
  resumeFocus: () => {
    return resumeFocusAction();
  },
  discardFocus: sessionId => {
    return discardFocusAction(sessionId);
  },
  updateName: input => {
    return updateNameAction(input);
  },
  updateTag: input => {
    return updateTagAction(input);
  },
  setPassword: input => {
    return setPasswordAction(input);
  },
  updateWeekStart: input => {
    return updateWeekStartAction(input);
  },
  updateTimezone: input => {
    return updateTimezoneAction(input);
  },
  updateAvatar: input => {
    return updateAvatarAction(input);
  },
  uploadAvatarPhoto: form => {
    return uploadAvatarPhotoAction(form);
  },
  updateAccent: input => {
    return updateAccentAction(input);
  },
  updateSound: input => {
    return updateSoundAction(input);
  },
  uploadSound: form => {
    return uploadSoundAction(form);
  },
  removeSound: soundId => {
    return removeSoundAction(soundId);
  },
  importBackup: form => {
    return importBackupAction(form);
  },
  deleteAccount: email => {
    return deleteAccountAction(email);
  },
  syncTimezone: browserTimeZone => {
    return syncTimezoneAction(browserTimeZone);
  },
  sendContact: input => {
    return sendContactAction(input);
  },
  signIn: (input, next) => {
    return signInAction(input, next);
  },
  signUp: (input, next) => {
    return signUpAction(input, next);
  },
  register: (input, next) => {
    return registerAction(input, next);
  },
  signOut: () => {
    return signOut();
  },
};
