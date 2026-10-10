'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { isCalendarDate } from '@/domain/dates';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { msg, translateMsg, type Msg } from '@/lib/message';
import { completionErrorMsg } from '@/server/completion-errors';
import { getProfile } from '@/server/habits';
import type { ActionResult } from '../habits/actions';

const input = z.object({ habitId: z.uuid(), date: z.string().refine(isCalendarDate), done: z.boolean() });

const fail = async (m: Msg): Promise<ActionResult> => {
  return { ok: false, error: translateMsg(await getTranslations(), m) };
};

/** Ticks or unticks a habit for a day. The database function enforces the rules; this only translates its errors. */
export const setCompletionAction = async (habitId: string, date: string, done: boolean): Promise<ActionResult> => {
  if (!(await getUser())) {
    return fail(msg('errors.signIn'));
  }

  const parsed = input.safeParse({ habitId, date, done });

  if (!parsed.success) {
    return fail(msg('errors.saveFailed'));
  }

  try {
    const { today } = await getProfile();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('set_completion', {
      p_habit_id: parsed.data.habitId,
      p_date: parsed.data.date,
      p_done: parsed.data.done,
      p_today: today,
    });

    if (error) {
      if (error.code === 'P0001') {
        return fail(completionErrorMsg(error.message));
      }

      throw new Error(error.message);
    }

    return { ok: true };
  } catch (e) {
    console.error(e);

    return fail(msg('errors.saveFailed'));
  } finally {
    // also after a failure, so the pages show what the server really has
    revalidatePath('/today');
    revalidatePath('/');
  }
};
