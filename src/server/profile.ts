import 'server-only';
import { connection } from 'next/server';
import type { AvatarInput } from '@/lib/profile-schema';
import { CHIME_IDS } from '@/lib/chimes';
import { isSoundId } from '@/lib/sound';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import { stopFocus } from '@/server/focus';
import { toProfileView, type ProfileView } from '@/server/profile-view';
import { ProfileError, removeFiles, signedUrls } from '@/server/profile-storage';

const COLUMNS =
  'display_name, tag, avatar_url, avatar_kind, avatar_value, avatar_color, timezone, week_starts_on, sound_id, sound_volume, accent, accent_custom, password_set';

/** The signed-in person's id and a client, or the error that sends them to sign in again. */
export const requireOwner = async () => {
  const user = await getUser();

  if (!user) {
    throw new ProfileError('signIn');
  }

  const { id, email } = user;

  return { supabase: await createSupabaseServerClient(), id, email: email ?? '' };
};

export const getProfileView = async (): Promise<ProfileView> => {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const { supabase, id, email } = await requireOwner();
  const [{ data: row, error: rowError }, { data: sounds, error: soundsError }] = await Promise.all([
    supabase.from('profiles').select(COLUMNS).eq('user_id', id).single(),
    supabase.from('custom_sounds').select('id, name, path, duration_ms').order('created_at'),
  ]);

  if (rowError) {
    throw rowError;
  }

  if (soundsError) {
    throw soundsError;
  }

  const { avatar_kind, avatar_value } = row;

  return toProfileView({
    row,
    email,
    sounds,
    urls: {
      ...(await signedUrls(
        'sounds',
        sounds.map(({ path }) => {
          return path;
        }),
      )),
      ...(avatar_kind === 'photo' && avatar_value ? await signedUrls('avatars', [avatar_value]) : {}),
    },
  });
};

const save = async (patch: TablesUpdate<'profiles'>): Promise<void> => {
  const { supabase, id } = await requireOwner();
  const { error } = await supabase.from('profiles').update(patch).eq('user_id', id);

  if (error) {
    throw error;
  }
};

export const updateName = async (name: string): Promise<void> => {
  await save({ display_name: name });
};

/** A tag is unique whatever its case: a clash is the person's to fix, not a failure. */
export const updateTag = async (tag: string): Promise<void> => {
  try {
    await save({ tag });
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      throw new ProfileError('tagTaken');
    }

    throw e;
  }
};

export const updateWeekStart = async (weekStartsOn: 1 | 7): Promise<void> => {
  await save({ week_starts_on: weekStartsOn });
};

/** A running focus session is ended first (not ticked), so it is not cut in two by the day changing under it. */
export const updateTimezone = async (timezone: string): Promise<void> => {
  await stopFocus();
  await save({ timezone });
};

/** The path of the photo being replaced, so its file can be removed once the new avatar is saved. */
const currentPhoto = async (): Promise<string | null> => {
  const { supabase, id } = await requireOwner();
  const { data } = await supabase.from('profiles').select('avatar_kind, avatar_value').eq('user_id', id).maybeSingle();

  return data?.avatar_kind === 'photo' ? data.avatar_value : null;
};

export const updateAvatar = async (input: AvatarInput): Promise<void> => {
  const { kind, value, color } = input;
  const previous = await currentPhoto();

  await save({ avatar_kind: kind, avatar_value: value, avatar_color: color });

  if (previous) {
    await removeFiles('avatars', [previous]);
  }
};

export const updateAccent = async (accent: string, customHex: string | null): Promise<void> => {
  await save({ accent, accent_custom: customHex });
};

export const updateSound = async (soundId: string, volume: number): Promise<void> => {
  const { supabase } = await requireOwner();

  if (!isSoundId(soundId)) {
    throw new ProfileError('soundInvalid');
  }

  if (!(CHIME_IDS as readonly string[]).includes(soundId)) {
    const { data } = await supabase.from('custom_sounds').select('id').eq('id', soundId).maybeSingle();

    if (!data) {
      throw new ProfileError('soundInvalid');
    }
  }

  await save({ sound_id: soundId, sound_volume: volume });
};
