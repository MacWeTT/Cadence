import 'server-only';
import { sniffAudio, sniffImage } from '@/lib/file-sniff';
import { checkPhotoFile, checkSoundFile, soundNameFromFile } from '@/lib/profile-schema';
import { putFile, removeFiles, ProfileError } from '@/server/profile-storage';
import { requireOwner } from '@/server/profile';

const IMAGE_EXTENSION = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
const AUDIO_EXTENSION = { 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg' } as const;

/** A browser may call a WAV file audio/x-wav; it is the same kind. */
const kindOf = (type: string): string => {
  return type === 'audio/x-wav' ? 'audio/wav' : type;
};

/** Stores a new profile photo (already cropped square in the browser) and makes it the avatar. */
export const uploadAvatarPhoto = async (file: File): Promise<void> => {
  const { type, size } = file;
  const problem = checkPhotoFile({ type, size });

  if (problem) {
    throw new ProfileError(problem);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);

  // The type a browser sends can say anything: the first bytes must agree with it.
  if (!sniffed || sniffed !== type) {
    throw new ProfileError('photoType');
  }

  const { supabase, id } = await requireOwner();
  const path = `${id}/avatar-${crypto.randomUUID()}.${IMAGE_EXTENSION[sniffed]}`;
  const { data: before } = await supabase
    .from('profiles')
    .select('avatar_kind, avatar_value')
    .eq('user_id', id)
    .maybeSingle();

  await putFile('avatars', path, bytes, sniffed);

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_kind: 'photo', avatar_value: path, avatar_color: null })
    .eq('user_id', id);

  if (error) {
    await removeFiles('avatars', [path]);

    throw error;
  }

  const { avatar_kind, avatar_value } = before ?? {};

  if (avatar_kind === 'photo' && avatar_value) {
    await removeFiles('avatars', [avatar_value]);
  }
};

/** Adds a custom sound (at most six, each up to 5 seconds, measured in the browser) and returns its id. */
export const uploadSound = async (file: File, durationMs: number): Promise<string> => {
  const { type, size, name } = file;
  const problem = checkSoundFile({ type, size, durationMs });

  if (problem) {
    throw new ProfileError(problem);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffAudio(bytes);

  if (!sniffed || sniffed !== kindOf(type)) {
    throw new ProfileError('soundType');
  }

  const { supabase, id: userId } = await requireOwner();
  const soundId = crypto.randomUUID();
  const path = `${userId}/${soundId}.${AUDIO_EXTENSION[sniffed]}`;

  await putFile('sounds', path, bytes, sniffed);

  const { error } = await supabase
    .from('custom_sounds')
    .insert({ id: soundId, name: soundNameFromFile(name), path, duration_ms: Math.round(durationMs) });

  if (error) {
    await removeFiles('sounds', [path]);

    throw error.message.includes('sound_limit') ? new ProfileError('soundLimit') : error;
  }

  return soundId;
};

/** Removes a custom sound and its file. If it was the sound in use, the database puts the Bell back. */
export const removeSound = async (soundId: string): Promise<void> => {
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.from('custom_sounds').delete().eq('id', soundId).select('path').maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    await removeFiles('sounds', [data.path]);
  }
};
