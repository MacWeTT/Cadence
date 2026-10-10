import { z } from 'zod';
import { isCalendarDate, type CalendarDate } from '@/domain/dates';
import { COLOR_KEYS } from './palette';

/** True for exactly one emoji (one grapheme, including skin-tone, ZWJ and flag sequences). */
export function isSingleEmoji(value: string): boolean {
  if ([...new Intl.Segmenter().segment(value)].length !== 1) return false;
  // U+20E3 is the combining keycap, which makes 1️⃣ #️⃣ *️⃣ single emoji even though their base is a plain character.
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(value);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Habit form input. `today` is today in the user's timezone: a habit cannot start in the future. */
export const habitInputSchema = (today: CalendarDate) =>
  z
    .object({
      name: z.string().trim().min(1, 'Give your habit a name').max(80, 'Keep the name to 80 characters or fewer'),
      description: z.string().trim().max(280, 'Keep the description to 280 characters or fewer').optional(),
      icon: z.string().refine(isSingleEmoji, 'Choose a single emoji'),
      color: z.enum(COLOR_KEYS, 'Choose a color'),
      kind: z.enum(['daily', 'weekly_count']),
      timesPerWeek: z
        .number()
        .int()
        .min(1, 'Choose 1 to 6 times a week')
        .max(6, 'Choose 1 to 6 times a week')
        .optional(),
      startDate: z
        .string()
        .refine(isCalendarDate, 'Enter a valid date')
        .refine(d => d >= '2000-01-01' && d <= today, 'The start date can be any day up to today'),
    })
    .superRefine((v, ctx) => {
      if (v.kind === 'weekly_count' && v.timesPerWeek === undefined) {
        ctx.addIssue({ code: 'custom', path: ['timesPerWeek'], message: 'Choose 1 to 6 times a week' });
      }
      if (v.kind === 'daily' && v.timesPerWeek !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['timesPerWeek'], message: 'A daily habit has no weekly count' });
      }
    });

export type HabitInput = z.infer<ReturnType<typeof habitInputSchema>>;

/** The first message for each field, keyed by field name. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
