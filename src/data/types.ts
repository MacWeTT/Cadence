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

/** What a profile edit answers: it worked (a new sound has an `id`), or why not. */
export type ProfileActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** What an account change answers: it worked (an import says how much it brought in), or why not. */
export type AccountActionResult = { ok: true; summary?: BackupSummary } | { ok: false; error: string };

/** What the contact form hears back: it was sent, or why not (and which fields). */
export type ContactResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** What the register, sign-in and create-account forms hear back: where to go on to, or the message to show. */
export type AuthResult = { next: string | null; error: string | null };

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

  /** The profile's edits. `input` is what the modal holds; it is checked where it is saved. */
  updateName: (input: unknown) => Promise<ProfileActionResult>;
  updateTag: (input: unknown) => Promise<ProfileActionResult>;
  setPassword: (input: unknown) => Promise<ProfileActionResult>;
  updateWeekStart: (input: unknown) => Promise<ProfileActionResult>;
  updateTimezone: (input: unknown) => Promise<ProfileActionResult>;
  updateAvatar: (input: unknown) => Promise<ProfileActionResult>;
  uploadAvatarPhoto: (form: FormData) => Promise<ProfileActionResult>;
  updateAccent: (input: unknown) => Promise<ProfileActionResult>;
  updateSound: (input: unknown) => Promise<ProfileActionResult>;
  uploadSound: (form: FormData) => Promise<ProfileActionResult>;
  removeSound: (soundId: unknown) => Promise<ProfileActionResult>;

  /** Replaces all habits and history with the backup file in `form`. */
  importBackup: (form: FormData) => Promise<AccountActionResult>;
  /** Deletes the account and everything in it, after the person has typed their email address. */
  deleteAccount: (email: unknown) => Promise<AccountActionResult>;

  /** Offers the browser's timezone to the account (it is only saved over the UTC default); true when it was saved. */
  syncTimezone: (browserTimeZone: string) => Promise<boolean>;
  sendContact: (input: unknown) => Promise<ContactResult>;

  /** Signing in and out, and the first account steps. `next` is where to go afterwards; it is checked again. */
  signIn: (input: unknown, next: string | null) => Promise<AuthResult>;
  signUp: (input: unknown, next: string | null) => Promise<AuthResult>;
  register: (input: unknown, next: string | null) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}
