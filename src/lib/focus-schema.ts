import { z } from 'zod';
import { isSoundId } from '@/lib/sound';

const planSchema = z.object({
  focusMin: z.number(),
  breakMin: z.number(),
  longBreakMin: z.number(),
  rounds: z.number(),
});

/** What the focus setup panel holds when a session starts; the numbers are checked again by `planErrors`. */
export const startSchema = z.object({
  habitId: z.uuid(),
  mode: z.enum(['free', 'pomodoro']),
  plan: planSchema.nullable(),
  soundId: z.string().refine(isSoundId).nullable(),
});
