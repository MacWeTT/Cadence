import type { AccountSettings } from '@/data/local/sync';

/** The account refused a change for good (the record it names is gone, say): it is dropped, not retried forever. */
export class Rejected extends Error {}

export interface HabitPayload {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  startDate: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  schedules: { kind: string; timesPerWeek: number | null; weekdays: number[] | null; effectiveFrom: string }[];
  pauses: { archivedOn: string; restoredOn: string | null }[];
}

export interface RemoteHabit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  start_date: string;
  links: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  schedules: { kind: string; times_per_week: number | null; weekdays: number[] | null; effective_from: string }[];
  pauses: { archived_on: string; restored_on: string | null }[];
}

export interface RemoteFocus {
  id: string;
  habit_id: string;
  started_at: string;
  ended_at: string;
  mode: string;
  plan: unknown;
  skipped_seconds: number;
  paused_seconds: number;
  focus_seconds: number | null;
  sound_id: string | null;
}

export interface RemoteState {
  habits: RemoteHabit[];
  ticks: { habit_id: string; completion_date: string }[];
  focus: RemoteFocus[];
  settings: AccountSettings;
}

/** What staying in step needs from the account: write one record by its id, and read everything. */
export interface StepPort {
  putHabit: (habit: HabitPayload) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  setTick: (habitId: string, date: string, done: boolean, today: string) => Promise<void>;
  putFocus: (session: RemoteFocus) => Promise<void>;
  deleteFocus: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<AccountSettings>) => Promise<void>;
  readState: () => Promise<RemoteState>;
}

export interface Dirty {
  kind: string;
  id: string;
  seq: number;
}
