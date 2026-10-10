'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { habitInputSchema, toFieldErrors, type FieldIssue } from '@/lib/habit-schema';
import { getUser } from '@/lib/supabase/server';
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getProfile,
  HabitError,
  type ErrorCode,
  restoreHabit,
  updateHabit,
} from '@/server/habits';

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Turns a failure's codes into the sentences the user reads. */
const describe = async (code: ErrorCode, fieldIssues?: Record<string, FieldIssue>): Promise<ActionResult> => {
  const t = await getTranslations('errors');
  const tv = await getTranslations('validation');

  return {
    ok: false,
    error: t(code),
    fieldErrors: fieldIssues
      ? Object.fromEntries(
          Object.entries(fieldIssues).map(([field, issue]) => {
            return [field, tv(issue.code, issue.values)];
          }),
        )
      : undefined,
  };
};

// Every action verifies the user itself, then relies on row-level security as the second layer.
const run = async (work: () => Promise<void>): Promise<ActionResult> => {
  if (!(await getUser())) {
    return describe('signIn');
  }

  try {
    await work();
    revalidatePath('/habits');
    revalidatePath('/');

    return { ok: true };
  } catch (e) {
    if (e instanceof HabitError) {
      return describe(e.code, e.fieldIssues);
    }

    console.error(e);

    return describe('generic');
  }
};

const parseInput = async (input: unknown) => {
  const { today } = await getProfile();
  const parsed = habitInputSchema(today).safeParse(input);

  if (!parsed.success) {
    throw new HabitError('fixFields', toFieldErrors(parsed.error));
  }

  return parsed.data;
};

export const createHabitAction = async (input: unknown): Promise<ActionResult> => {
  return run(async () => {
    return createHabit(await parseInput(input));
  });
};

export const updateHabitAction = async (id: string, input: unknown): Promise<ActionResult> => {
  return run(async () => {
    return updateHabit(id, await parseInput(input));
  });
};

export const archiveHabitAction = async (id: string): Promise<ActionResult> => {
  return run(() => {
    return archiveHabit(id);
  });
};

export const restoreHabitAction = async (id: string): Promise<ActionResult> => {
  return run(() => {
    return restoreHabit(id);
  });
};

export const deleteHabitAction = async (id: string): Promise<ActionResult> => {
  return run(() => {
    return deleteHabit(id);
  });
};
