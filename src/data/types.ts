import type { BackupSummary } from '@/lib/backup-types';
import type { FocusResult } from '@/server/focus';
import type { FocusState } from '@/server/focus-view';
import type { HabitsView } from '@/server/habits';
import type { HomeData } from '@/server/home';
import type { ProfileView } from '@/server/profile-view';
import type { ProgressData } from '@/server/progress';
import type { TodayData } from '@/server/today';

/** What a change answers: it worked, or why not (and which fields of the form, when it was a form). */
export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** What a focus change answers: what a stopped session left behind (for "I did it"), or why not. */
export type FocusActionResult = { ok: true; result: FocusResult | null } | { ok: false; error: string };

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

  /** `input` is what the habit form holds; it is checked where it is saved. */
  createHabit: (input: unknown) => Promise<ActionResult>;
  updateHabit: (id: string, input: unknown) => Promise<ActionResult>;
  archiveHabit: (id: string) => Promise<ActionResult>;
  restoreHabit: (id: string) => Promise<ActionResult>;
  deleteHabit: (id: string) => Promise<ActionResult>;
  /** Ticks (`done`) or unticks a habit on one day. */
  setCompletion: (habitId: string, date: string, done: boolean) => Promise<ActionResult>;

  /** `input` is what the setup panel holds (the habit, the mode, the plan, the sound); it is checked where it is saved. */
  startFocus: (input: unknown) => Promise<FocusActionResult>;
  /** Ends the running session; the answer carries what it left behind. */
  stopFocus: () => Promise<FocusActionResult>;
  skipBreak: () => Promise<FocusActionResult>;
  pauseFocus: () => Promise<FocusActionResult>;
  resumeFocus: () => Promise<FocusActionResult>;
  /** Removes a finished session so its minutes are not counted. */
  discardFocus: (sessionId: string) => Promise<FocusActionResult>;
}
