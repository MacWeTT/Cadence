import { z } from 'zod';
import { isCalendarDate, type CalendarDate } from '@/domain/dates';
import type en from '../../locales/en';
import { COLOR_KEYS } from './palette';

/** The name of a message in `locales/en/validation.json`. */
export type ValidationCode = keyof typeof en.validation;

/** What is wrong with one field: a validation message, and what fills its gaps. */
export interface FieldIssue {
  code: ValidationCode;
  values?: Record<string, string | number>;
}

/** True for exactly one emoji (one grapheme, including skin-tone, ZWJ and flag sequences). */
export const isSingleEmoji = (value: string): boolean => {
  if ([...new Intl.Segmenter().segment(value)].length !== 1) {
    return false;
  }

  // U+20E3 is the combining keycap, which makes 1️⃣ #️⃣ *️⃣ single emoji even though their base is a plain character.
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(value);
};

export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', { timeZone });

    return true;
  } catch {
    return false;
  }
};

/** Habit form input. `today` is today in the user's timezone: a habit cannot start in the future. */
export const habitInputSchema = (today: CalendarDate) => {
  return z
    .object({
      name: z.string().trim().min(1, 'nameRequired').max(80, 'nameTooLong'),
      description: z.string().trim().max(280, 'descriptionTooLong').optional(),
      icon: z.string().refine(isSingleEmoji, 'iconInvalid'),
      color: z.enum(COLOR_KEYS, 'colorInvalid'),
      kind: z.enum(['daily', 'weekly_count']),
      timesPerWeek: z.number().int().min(1, 'timesRange').max(6, 'timesRange').optional(),
      startDate: z
        .string()
        .refine(isCalendarDate, 'dateInvalid')
        .refine(d => {
          return d >= '2000-01-01' && d <= today;
        }, 'startRange'),
    })
    .superRefine((v, ctx) => {
      if (v.kind === 'weekly_count' && v.timesPerWeek === undefined) {
        ctx.addIssue({ code: 'custom', path: ['timesPerWeek'], message: 'timesRange' });
      }

      if (v.kind === 'daily' && v.timesPerWeek !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['timesPerWeek'], message: 'timesOnDaily' });
      }
    });
};

export type HabitInput = z.infer<ReturnType<typeof habitInputSchema>>;

/** The first problem for each field, keyed by field name. The schema's messages are validation codes. */
export const toFieldErrors = (error: z.ZodError): Record<string, FieldIssue> => {
  const out: Record<string, FieldIssue> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');

    out[key] ??= { code: issue.message as ValidationCode };
  }

  return out;
};
