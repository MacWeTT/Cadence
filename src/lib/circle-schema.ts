import { z } from 'zod';
import { isCalendarDate } from '@/domain/dates';
import { CIRCLE_COLORS, LABELS, LEVELS, REACTIONS } from '@/domain/circles';

// What the Circles actions accept, checked before the database is asked. The database checks again, as the last word.

export const circleIdInput = z.uuid();

/** An invite is 64 lower-case hex characters (see `create_invite`); anything else cannot open a circle. */
export const inviteTokenInput = z.string().regex(/^[0-9a-f]{64}$/);

const label = z.enum(LABELS);

export const shareInput = z.object({
  habitId: z.uuid(),
  circleId: z.uuid(),
  level: z.enum(LEVELS),
  label: label.optional(),
});

/** One person's level for a habit; `inherit` removes it and the circle's level applies again. */
export const overrideInput = z.object({
  habitId: z.uuid(),
  circleId: z.uuid(),
  viewerId: z.uuid(),
  level: z.enum(['inherit', ...LEVELS]),
  label: label.optional(),
});

export const prefsInput = z.object({
  circleId: z.uuid(),
  inWeek: z.boolean(),
  allowCheers: z.boolean(),
});

export const cheerInput = z.object({
  circleId: z.uuid(),
  toUser: z.uuid(),
  forDate: z.string().refine(isCalendarDate),
});

export const lookInput = z.object({
  circleId: z.uuid(),
  color: z.enum(CIRCLE_COLORS),
  pinned: z.boolean(),
});

/** A reaction to a friend's day, or taking it back (`on: false`). */
export const reactInput = z.object({
  circleId: z.uuid(),
  toUser: z.uuid(),
  forDate: z.string().refine(isCalendarDate),
  emoji: z.enum(REACTIONS),
  on: z.boolean(),
});
