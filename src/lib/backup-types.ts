import type { FocusPlan } from '@/domain/focus';

/** The shape of a Cadence backup. JSON holds it as is; CSV holds the same records one per row (see backup-csv.ts). */
export const BACKUP_VERSION = 1;

/** What an import accepts. One place, so the parser, the server check and the export warning never disagree. */
export const BACKUP_LIMITS = {
  bytes: 5 * 1024 * 1024,
  habits: 500,
  ticks: 200_000,
  focusSessions: 50_000,
} as const;

export type ScheduleKind = 'daily' | 'weekdays' | 'weekly_count' | 'optional';

export interface BackupSchedule {
  kind: ScheduleKind;
  timesPerWeek: number | null;
  weekdays: number[] | null;
  effectiveFrom: string;
}

export interface BackupPause {
  archivedOn: string;
  restoredOn: string | null;
}

export interface BackupFocus {
  startedAt: string;
  endedAt: string;
  mode: 'free' | 'pomodoro';
  plan: FocusPlan | null;
  skippedSeconds: number;
  focusSeconds: number;
}

export interface BackupHabit {
  name: string;
  description: string | null;
  icon: string;
  color: string;
  startDate: string;
  createdAt: string | null;
  links: string[];
  archivedAt: string | null;
  schedules: BackupSchedule[];
  ticks: string[];
  pauses: BackupPause[];
  focusSessions: BackupFocus[];
}

export interface Backup {
  app: 'cadence';
  version: number;
  exportedAt: string;
  /** For information: an import never changes the account's own settings. */
  profile: { name: string; timezone: string; weekStartsOn: 1 | 7 };
  habits: BackupHabit[];
}

export interface BackupSummary {
  habits: number;
  ticks: number;
  focusSessions: number;
}

/**
 * Why a file was refused. The code is a message in `locales/en/account.json` (`import.errors.<code>`); `values` fill its
 * gaps (a limit and the file's own number, the place in the file, a row).
 */
export interface BackupError {
  code: 'unreadable' | 'notBackup' | 'newerVersion' | 'tooBig' | 'tooMany' | 'invalid' | 'badCsv' | 'badCsvDate';
  values?: Record<string, string | number>;
}

export type ParseResult = { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; error: BackupError };
