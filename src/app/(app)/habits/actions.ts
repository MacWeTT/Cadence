'use server';

import { revalidatePath } from 'next/cache';
import { habitInputSchema, toFieldErrors } from '@/lib/habit-schema';
import { getUser } from '@/lib/supabase/server';
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getProfile,
  HabitError,
  restoreHabit,
  updateHabit,
} from '@/server/habits';

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Every action verifies the user itself, then relies on row-level security as the second layer.
const run = async (work: () => Promise<void>): Promise<ActionResult> => {
  if (!(await getUser())) {
    return { ok: false, error: 'Please sign in again.' };
  }

  try {
    await work();
    revalidatePath('/habits');
    revalidatePath('/');

    return { ok: true };
  } catch (e) {
    if (e instanceof HabitError) {
      return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    }

    console.error(e);

    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
};

const parseInput = async (input: unknown) => {
  const { today } = await getProfile();
  const parsed = habitInputSchema(today).safeParse(input);

  if (!parsed.success) {
    throw new HabitError('Please fix the highlighted fields.', toFieldErrors(parsed.error));
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
