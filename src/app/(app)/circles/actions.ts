'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import {
  cheerInput,
  circleIdInput,
  inviteTokenInput,
  overrideInput,
  lookInput,
  prefsInput,
  reactInput,
  shareInput,
} from '@/lib/circle-schema';
import { getUser } from '@/lib/supabase/server';
import {
  createCircle,
  createInvite,
  deleteCircle,
  joinCircle,
  leaveCircle,
  reactTo,
  removeMember,
  sendCheer,
  setCircleLook,
  setCirclePrefs,
  setCirclesPaused,
  setShare,
  setShareOverride,
} from '@/server/circles';
import { HabitError, type ErrorCode } from '@/server/habits';

/** Both outcomes carry both fields, so a caller can destructure `{ ok, value, error }` once and still narrow on `ok`. */
export type CircleActionResult<T = null> =
  { ok: true; value: T; error: null } | { ok: false; value: null; error: string };

const removeInput = z.object({ circleId: z.uuid(), userId: z.uuid() });

const fail = async (code: ErrorCode): Promise<{ ok: false; value: null; error: string }> => {
  const t = await getTranslations('errors');

  return { ok: false, value: null, error: t(code) };
};

// Every action checks its input, verifies the user itself, then relies on the database as the last word: the
// functions behind these check who is asking, and row-level security covers the rest.
const run = async <T>(work: () => Promise<T>): Promise<CircleActionResult<T>> => {
  if (!(await getUser())) {
    return fail('signIn');
  }

  try {
    return { ok: true, value: await work(), error: null };
  } catch (error) {
    if (error instanceof HabitError) {
      return fail(error.code);
    }

    console.error(error);

    return fail('generic');
  }
};

/** Makes a circle and returns its id. */
export const createCircleAction = async (input: unknown): Promise<CircleActionResult<string>> => {
  const { success, data } = z.string().safeParse(input);

  if (!success) {
    return fail('circleNameInvalid');
  }

  return run(() => {
    return createCircle(data);
  });
};

/** Makes a new invite and returns its token, shown once. */
export const createInviteAction = async (input: unknown): Promise<CircleActionResult<string>> => {
  const { success, data } = circleIdInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  return run(() => {
    return createInvite(data);
  });
};

/** Joins the circle an invite opens and returns its id. */
export const joinCircleAction = async (input: unknown): Promise<CircleActionResult<string>> => {
  const { success, data } = inviteTokenInput.safeParse(input);

  if (!success) {
    return fail('inviteInvalid');
  }

  return run(() => {
    return joinCircle(data);
  });
};

export const leaveCircleAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = circleIdInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  return run(async () => {
    await leaveCircle(data);

    return null;
  });
};

export const deleteCircleAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = circleIdInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  return run(async () => {
    await deleteCircle(data);

    return null;
  });
};

/** The owner removes a member. */
export const removeMemberAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = removeInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { circleId, userId } = data;

  return run(async () => {
    await removeMember(circleId, userId);

    return null;
  });
};

/** How much of one of your habits a circle sees; `hidden` takes it back. */
export const setShareAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = shareInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { habitId, circleId, level, label } = data;

  return run(async () => {
    await setShare(habitId, circleId, level, label);

    return null;
  });
};

/** One person's level for one of your habits, in place of the circle's; `inherit` removes it. */
export const setShareOverrideAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = overrideInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { habitId, circleId, viewerId, level, label } = data;

  return run(async () => {
    await setShareOverride(habitId, circleId, viewerId, level, label);

    return null;
  });
};

/** Whether your week counts towards the circle's, and whether friends can cheer you. */
export const setCirclePrefsAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = prefsInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { circleId, inWeek, allowCheers } = data;

  return run(async () => {
    await setCirclePrefs(circleId, inWeek, allowCheers);

    return null;
  });
};

/** A cheer for a friend's day (their own today). */
export const sendCheerAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = cheerInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { circleId, toUser, forDate } = data;

  return run(async () => {
    await sendCheer(circleId, toUser, forDate);

    return null;
  });
};

/** Pause or resume sharing in every circle at once. */
export const setCirclesPausedAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = z.boolean().safeParse(input);

  if (!success) {
    return fail('generic');
  }

  return run(async () => {
    await setCirclesPaused(data);

    return null;
  });
};

/** Your own colour and pin for a circle. Only you see them. */
export const setCircleLookAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = lookInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { circleId, color, pinned } = data;

  return run(async () => {
    await setCircleLook(circleId, color, pinned);

    return null;
  });
};

/** An emoji on a friend's day, or taking it back. */
export const reactAction = async (input: unknown): Promise<CircleActionResult> => {
  const { success, data } = reactInput.safeParse(input);

  if (!success) {
    return fail('generic');
  }

  const { circleId, toUser, forDate, emoji, on } = data;

  return run(async () => {
    await reactTo(circleId, toUser, forDate, emoji, on);

    return null;
  });
};
