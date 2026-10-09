"use server";

import { revalidatePath } from "next/cache";
import { habitInputSchema, toFieldErrors } from "@/lib/habit-schema";
import { getUser } from "@/lib/supabase/server";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  getProfile,
  HabitError,
  restoreHabit,
  updateHabit,
} from "@/server/habits";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Every action verifies the user itself, then relies on row-level security as the second layer.
async function run(work: () => Promise<void>): Promise<ActionResult> {
  if (!(await getUser())) return { ok: false, error: "Please sign in again." };
  try {
    await work();
    revalidatePath("/habits");
    return { ok: true };
  } catch (e) {
    if (e instanceof HabitError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

async function parseInput(input: unknown) {
  const { today } = await getProfile();
  const parsed = habitInputSchema(today).safeParse(input);
  if (!parsed.success) throw new HabitError("Please fix the highlighted fields.", toFieldErrors(parsed.error));
  return parsed.data;
}

export async function createHabitAction(input: unknown): Promise<ActionResult> {
  return run(async () => createHabit(await parseInput(input)));
}

export async function updateHabitAction(id: string, input: unknown): Promise<ActionResult> {
  return run(async () => updateHabit(id, await parseInput(input)));
}

export async function archiveHabitAction(id: string): Promise<ActionResult> {
  return run(() => archiveHabit(id));
}

export async function restoreHabitAction(id: string): Promise<ActionResult> {
  return run(() => restoreHabit(id));
}

export async function deleteHabitAction(id: string): Promise<ActionResult> {
  return run(() => deleteHabit(id));
}
