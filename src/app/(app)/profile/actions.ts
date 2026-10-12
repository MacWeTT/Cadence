'use server';

import { getTranslations } from 'next-intl/server';
import type { z } from 'zod';
import {
  accentInputSchema,
  avatarInputSchema,
  nameInputSchema,
  soundInputSchema,
  timezoneInputSchema,
  weekStartInputSchema,
} from '@/lib/profile-schema';
import { getUser } from '@/lib/supabase/server';
import { updateAccent, updateAvatar, updateName, updateSound, updateTimezone, updateWeekStart } from '@/server/profile';
import { removeSound, uploadAvatarPhoto, uploadSound } from '@/server/profile-files';
import { ProfileError } from '@/server/profile-storage';

/** What an edit answers: the browser shows the message as an error toast and puts the old value back. */
export type ProfileActionResult = { ok: true; id?: string } | { ok: false; error: string };

const fail = async (error: unknown): Promise<ProfileActionResult> => {
  const [t, tv] = await Promise.all([getTranslations('errors'), getTranslations('validation')]);

  if (error instanceof ProfileError) {
    const { code } = error;

    return { ok: false, error: code === 'signIn' ? t('signIn') : tv(code as 'zoneInvalid') };
  }

  console.error(error);

  return { ok: false, error: t('generic') };
};

const invalid = async (error: z.ZodError): Promise<ProfileActionResult> => {
  const tv = await getTranslations('validation');
  const [issue] = error.issues;

  return { ok: false, error: tv(issue.message as 'zoneInvalid') };
};

// Every action verifies the person itself, then relies on row-level security as the second layer.
const run = async (work: () => Promise<string | void>): Promise<ProfileActionResult> => {
  if (!(await getUser())) {
    return fail(new ProfileError('signIn'));
  }

  try {
    const id = await work();

    return id ? { ok: true, id } : { ok: true };
  } catch (e) {
    return fail(e);
  }
};

export const updateNameAction = async (input: unknown): Promise<ProfileActionResult> => {
  const { success, data, error } = nameInputSchema.safeParse(input);

  if (!success) {
    return invalid(error);
  }

  const { name } = data;

  return run(() => {
    return updateName(name);
  });
};

export const updateWeekStartAction = async (input: unknown): Promise<ProfileActionResult> => {
  const { success, data, error } = weekStartInputSchema.safeParse(input);

  if (!success) {
    return invalid(error);
  }

  const { weekStartsOn } = data;

  return run(() => {
    return updateWeekStart(weekStartsOn);
  });
};

export const updateTimezoneAction = async (input: unknown): Promise<ProfileActionResult> => {
  const { success, data, error } = timezoneInputSchema.safeParse(input);

  if (!success) {
    return invalid(error);
  }

  const { timezone } = data;

  return run(() => {
    return updateTimezone(timezone);
  });
};

export const updateAvatarAction = async (input: unknown): Promise<ProfileActionResult> => {
  const { success, data, error } = avatarInputSchema.safeParse(input);

  if (!success) {
    return invalid(error);
  }

  return run(() => {
    return updateAvatar(data);
  });
};

export const uploadAvatarPhotoAction = async (form: FormData): Promise<ProfileActionResult> => {
  const file = form.get('file');

  if (!(file instanceof File)) {
    return fail(new ProfileError('photoType'));
  }

  return run(() => {
    return uploadAvatarPhoto(file);
  });
};

export const updateAccentAction = async (input: unknown): Promise<ProfileActionResult> => {
  const { success, data, error } = accentInputSchema.safeParse(input);

  if (!success) {
    return invalid(error);
  }

  const { accent, customHex } = data;

  return run(() => {
    return updateAccent(accent, customHex);
  });
};

export const updateSoundAction = async (input: unknown): Promise<ProfileActionResult> => {
  const { success, data, error } = soundInputSchema.safeParse(input);

  if (!success) {
    return invalid(error);
  }

  const { id, volume } = data;

  return run(() => {
    return updateSound(id, volume);
  });
};

/** Adds a custom sound; the browser has already measured its length. Answers with the new sound's id. */
export const uploadSoundAction = async (form: FormData): Promise<ProfileActionResult> => {
  const file = form.get('file');
  const durationMs = Number(form.get('durationMs'));

  if (!(file instanceof File)) {
    return fail(new ProfileError('soundType'));
  }

  return run(() => {
    return uploadSound(file, durationMs);
  });
};

export const removeSoundAction = async (soundId: unknown): Promise<ProfileActionResult> => {
  if (typeof soundId !== 'string') {
    return fail(new ProfileError('soundInvalid'));
  }

  return run(() => {
    return removeSound(soundId);
  });
};
