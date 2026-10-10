"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCalendarDate } from "@/domain/dates";
import { createSupabaseServerClient, getUser } from "@/lib/supabase/server";
import { completionErrorMessage, GENERIC_SAVE_ERROR } from "@/server/completion-errors";
import { getProfile } from "@/server/habits";
import type { ActionResult } from "../habits/actions";

const input = z.object({ habitId: z.uuid(), date: z.string().refine(isCalendarDate), done: z.boolean() });

/** Ticks or unticks a habit for a day. The database function enforces the rules; this only translates its errors. */
export async function setCompletionAction(habitId: string, date: string, done: boolean): Promise<ActionResult> {
  if (!(await getUser())) return { ok: false, error: "Please sign in again." };
  const parsed = input.safeParse({ habitId, date, done });
  if (!parsed.success) return { ok: false, error: GENERIC_SAVE_ERROR };

  try {
    const { today } = await getProfile();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("set_completion", {
      p_habit_id: parsed.data.habitId,
      p_date: parsed.data.date,
      p_done: parsed.data.done,
      p_today: today,
    });
    if (error) {
      if (error.code === "P0001") return { ok: false, error: completionErrorMessage(error.message) };
      throw new Error(error.message);
    }
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: GENERIC_SAVE_ERROR };
  } finally {
    revalidatePath("/today"); // also after a failure, so the page shows what the server really has
  }
}
