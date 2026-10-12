import { z } from 'zod';
import { parseHex } from '@/lib/accent-color';
import { CHARACTER_IDS, PHOTO_MAX_BYTES, PHOTO_TYPES } from '@/lib/avatar';
import { isSingleEmoji, type ValidationCode } from '@/lib/habit-schema';
import { isSoundId, SOUND_MAX_BYTES, SOUND_MAX_MS, SOUND_NAME_MAX, SOUND_TYPES } from '@/lib/sound';
import { isKnownZone, modernZone } from '@/lib/zones';

/** What each profile edit may send. The messages are validation codes, like the habit and contact schemas. */
export const NAME_MAX = 50;

export const nameInputSchema = z.object({
  name: z.string().trim().min(1, 'profileNameRequired').max(NAME_MAX, 'profileNameTooLong'),
});

export const weekStartInputSchema = z.object({
  weekStartsOn: z.union([z.literal(1), z.literal(7)], 'weekStartInvalid'),
});

/** Only a listed zone, saved under its current name (an old name like Asia/Calcutta becomes Asia/Kolkata). */
export const timezoneInputSchema = z.object({
  timezone: z.string().refine(isKnownZone, 'zoneInvalid').transform(modernZone),
});

const colorSchema = z
  .string()
  .refine(value => {
    return parseHex(value) !== null;
  }, 'colorInvalid')
  .transform(value => {
    return parseHex(value) as string;
  });

/** A character or an emoji with its colour. A photo and the Google picture are set by their own paths, not here. */
export const avatarInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('character'), value: z.enum(CHARACTER_IDS, 'avatarInvalid'), color: colorSchema }),
  z.object({
    kind: z.literal('emoji'),
    value: z.string().refine(isSingleEmoji, 'avatarInvalid'),
    color: colorSchema,
  }),
]);

export type AvatarInput = z.infer<typeof avatarInputSchema>;

export const soundInputSchema = z.object({
  id: z.string().refine(isSoundId, 'soundInvalid'),
  volume: z.number().min(0, 'soundInvalid').max(1, 'soundInvalid'),
});

export interface FileInfo {
  type: string;
  size: number;
}

/** The first problem with a photo, or null. The only limits are the type and the size, not the dimensions. */
export const checkPhotoFile = ({ type, size }: FileInfo): ValidationCode | null => {
  if (!(PHOTO_TYPES as readonly string[]).includes(type) || size <= 0) {
    return 'photoType';
  }

  return size > PHOTO_MAX_BYTES ? 'photoTooBig' : null;
};

/** The first problem with a sound, or null. The length is measured in the browser before the upload. */
export const checkSoundFile = ({
  type,
  size,
  durationMs,
}: FileInfo & { durationMs: number }): ValidationCode | null => {
  if (!(SOUND_TYPES as readonly string[]).includes(type) || size <= 0) {
    return 'soundType';
  }

  if (size > SOUND_MAX_BYTES) {
    return 'soundTooBig';
  }

  return Number.isFinite(durationMs) && durationMs > 0 && durationMs <= SOUND_MAX_MS ? null : 'soundTooLong';
};

/** A sound's name from its file name: no extension, at most 40 characters, never empty. */
export const soundNameFromFile = (fileName: string): string => {
  const name = fileName
    .trim()
    .replace(/\.[^.]*$/, '')
    .trim()
    .slice(0, SOUND_NAME_MAX)
    .trim();

  return name === '' ? 'Sound' : name;
};
