import { CHIME_IDS } from '@/lib/chimes';

/** Up to six sounds of a person's own, each short: a soundboard, not a music library. */
export const CUSTOM_SOUND_LIMIT = 6;
export const SOUND_MAX_BYTES = 500 * 1024;
export const SOUND_MAX_MS = 5000;
export const SOUND_NAME_MAX = 40;
export const SOUND_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True for a built-in sound name or a custom sound's id (whether the person owns it is checked by the server). */
export const isSoundId = (value: string): boolean => {
  return (CHIME_IDS as readonly string[]).includes(value) || UUID.test(value);
};
