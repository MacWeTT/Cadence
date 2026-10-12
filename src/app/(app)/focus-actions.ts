'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { getUser } from '@/lib/supabase/server';
import { skipBreak, startFocus, stopFocus, type FocusResult } from '@/server/focus';
import { HabitError, type ErrorCode } from '@/server/habits';

export type FocusActionResult = { ok: true; result: FocusResult | null } | { ok: false; error: string };

const planSchema = z.object({
  focusMin: z.number(),
  breakMin: z.number(),
  longBreakMin: z.number(),
  rounds: z.number(),
});
const startSchema = z.object({
  habitId: z.uuid(),
  mode: z.enum(['free', 'pomodoro']),
  plan: planSchema.nullable(),
});

const describe = async (code: ErrorCode): Promise<FocusActionResult> => {
  const t = await getTranslations('errors');

  return { ok: false, error: t(code) };
};

// Every action verifies the user itself, then relies on row-level security as the second layer.
const run = async (work: () => Promise<FocusResult | null>): Promise<FocusActionResult> => {
  if (!(await getUser())) {
    return describe('signIn');
  }

  try {
    return { ok: true, result: await work() };
  } catch (e) {
    if (e instanceof HabitError) {
      return describe(e.code);
    }

    console.error(e);

    return describe('generic');
  }
};

export const startFocusAction = async (input: unknown): Promise<FocusActionResult> => {
  const { success, data } = startSchema.safeParse(input);

  if (!success) {
    return describe('focusPlanInvalid');
  }

  const { habitId, mode, plan } = data;

  return run(async () => {
    await startFocus(habitId, mode, plan);

    return null;
  });
};

export const stopFocusAction = async (): Promise<FocusActionResult> => {
  return run(() => {
    return stopFocus();
  });
};

export const skipBreakAction = async (): Promise<FocusActionResult> => {
  return run(async () => {
    await skipBreak();

    return null;
  });
};
