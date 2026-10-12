/** The avatar choices. The Google picture is where everyone starts; the rest are chosen on the profile page. */
export const AVATAR_KINDS = ['google', 'character', 'emoji', 'photo'] as const;
export type AvatarKind = (typeof AVATAR_KINDS)[number];

/** The six drawn characters. The art lives in `components/avatar-character`; these are the ids stored on the profile. */
export const CHARACTER_IDS = ['alien', 'robot', 'cyclops', 'ghost', 'punk', 'mage'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** The emoji offered first; any other single emoji can be picked from the full picker. */
export const EMOJI_CHOICES = ['😀', '😎', '🤓', '🥳', '🌱', '🔥', '⚡', '🎧', '🚀', '🦊', '🐢', '🌈'] as const;

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
