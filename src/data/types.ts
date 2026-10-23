import type { BackupSummary } from '@/lib/backup-types';
import type { FocusState } from '@/server/focus-view';
import type { HabitsView } from '@/server/habits';
import type { HomeData } from '@/server/home';
import type { ProfileView } from '@/server/profile-view';
import type { ProgressData } from '@/server/progress';
import type { TodayData } from '@/server/today';

/**
 * Where the screens get their data. The web app reads it from the server (`remote`); the desktop app reads it from the
 * SQLite file on the PC (`local`). The screens only ever call this, so they do not know which one they have.
 */
export interface DataSource {
  habits: () => Promise<HabitsView>;
  home: () => Promise<HomeData>;
  /** One day of Today; `undefined` is today. */
  today: (date: string | undefined) => Promise<TodayData>;
  /** Progress for one habit filter (`null` is all habits) and one rate window in days. */
  progress: (habit: string | null, range: number) => Promise<ProgressData>;
  profile: () => Promise<ProfileView>;
  /** How much the account holds, for the Account tab. */
  account: () => Promise<BackupSummary>;
  /** The running focus session and the numbers last used on each habit. */
  focus: () => Promise<FocusState>;
}
