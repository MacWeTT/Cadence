import { toCalendarDate } from '@/domain/dates';
import type { QueryClient } from '@tanstack/react-query';
import { isSavedSession } from '@/domain/focus';
import { queryKeys } from '@/lib/query/keys';
import type { FocusResult } from '@/server/focus';
import { settle, type FocusSession } from '@/server/focus-view';

/**
 * What a Stop will answer, worked out here from the running session with the same pure rules the server uses (`settle`),
 * so the "Session finished" window can open the moment Stop is pressed instead of when the server answers. A stopped
 * session keeps the id it ran under, and `now` is the database's clock as the page last knew it. The server's answer, when
 * it comes, only confirms or corrects this.
 */
export const expectedResult = (session: FocusSession, nowMs: number, timezone: string): FocusResult => {
  const { id, habitId, mode, plan, startedAt, skippedSeconds, pausedAt, pausedSeconds, soundId } = session;
  const { focusSeconds } = settle(
    {
      id,
      habit_id: habitId,
      started_at: startedAt,
      ended_at: null,
      mode,
      plan,
      skipped_seconds: skippedSeconds,
      paused_at: pausedAt,
      paused_seconds: pausedSeconds,
      focus_seconds: null,
      sound_id: soundId,
    },
    new Date(nowMs),
  );

  return {
    sessionId: id,
    habitId,
    focusSeconds,
    date: toCalendarDate(startedAt, timezone),
    saved: isSavedSession(focusSeconds),
  };
};

/** The person's timezone, from what Home or the profile already read; this device's own when neither has been read yet. */
export const timezoneOf = (queryClient: QueryClient): string => {
  return (
    queryClient.getQueryData<{ timezone: string }>(queryKeys.home)?.timezone ??
    queryClient.getQueryData<{ timezone: string }>(queryKeys.profile)?.timezone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
};
