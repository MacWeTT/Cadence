import type { DataSource } from '@/data/types';

/** Stands in for every call until the SQLite data source is built (the desktop app's next step). */
const notBuilt = (): Promise<never> => {
  return Promise.reject(new Error('The desktop data source is not built yet.'));
};

/** The desktop app's data: the SQLite file on the PC. Nothing here imports server code, which is what the desktop build checks. */
export const local: DataSource = {
  habits: notBuilt,
  home: notBuilt,
  today: notBuilt,
  progress: notBuilt,
  profile: notBuilt,
  account: notBuilt,
  focus: notBuilt,
  createHabit: notBuilt,
  updateHabit: notBuilt,
  archiveHabit: notBuilt,
  restoreHabit: notBuilt,
  deleteHabit: notBuilt,
  setCompletion: notBuilt,
  startFocus: notBuilt,
  stopFocus: notBuilt,
  skipBreak: notBuilt,
  pauseFocus: notBuilt,
  resumeFocus: notBuilt,
  discardFocus: notBuilt,
  updateName: notBuilt,
  updateTag: notBuilt,
  setPassword: notBuilt,
  updateWeekStart: notBuilt,
  updateTimezone: notBuilt,
  updateAvatar: notBuilt,
  uploadAvatarPhoto: notBuilt,
  updateAccent: notBuilt,
  updateSound: notBuilt,
  uploadSound: notBuilt,
  removeSound: notBuilt,
  importBackup: notBuilt,
  deleteAccount: notBuilt,
  syncTimezone: notBuilt,
  sendContact: notBuilt,
  signIn: notBuilt,
  signUp: notBuilt,
  register: notBuilt,
  signOut: notBuilt,
};
