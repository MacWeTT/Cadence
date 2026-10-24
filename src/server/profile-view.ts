// Pure mapping behind the profile page. Kept free of `server-only` so it can be unit-tested.
import { parseHex } from '@/lib/accent-color';
import { ACCENTS, type Accent } from '@/lib/appearance';
import { CHARACTER_IDS, type AvatarKind } from '@/lib/avatar';
import { CHIME_IDS } from '@/lib/chimes';
import { isKnownZone, modernZone } from '@/lib/zones';

export interface ProfileRow {
  display_name: string | null;
  tag: string;
  avatar_url: string | null;
  avatar_kind: string;
  avatar_value: string | null;
  avatar_color: string | null;
  timezone: string;
  week_starts_on: number;
  sound_id: string;
  sound_volume: number;
  accent: string | null;
  accent_custom: string | null;
  password_set: boolean;
}

export interface SoundRow {
  id: string;
  name: string;
  path: string;
  duration_ms: number;
}

/** The avatar as the browser draws it: a picture link for the Google picture and a photo, a character or emoji with a colour. */
export interface AvatarView {
  kind: AvatarKind;
  value: string | null;
  color: string | null;
  url: string | null;
}

export interface SoundView {
  id: string;
  name: string;
  durationMs: number;
  url: string | null;
}

/** The app accent kept on the account: a preset, or 'custom' with its colour. */
export interface AccentView {
  accent: Accent;
  customHex: string | null;
}

export interface ProfileView {
  name: string;
  /** The account's tag, without the @. */
  tag: string;
  email: string;
  avatar: AvatarView;
  timezone: string;
  weekStartsOn: 1 | 7;
  sound: { id: string; volume: number };
  customSounds: SoundView[];
  /** Null until the person has chosen an accent on any device. */
  accent: AccentView | null;
  /** Whether the account has a password (a Google account made before passwords has none). */
  passwordSet: boolean;
}

interface ProfileInput {
  row: ProfileRow;
  email: string;
  sounds: SoundRow[];
  /** Signed links by storage path. */
  urls: Record<string, string>;
}

const toAvatar = (row: ProfileRow, urls: Record<string, string>): AvatarView => {
  const { avatar_kind, avatar_value, avatar_color, avatar_url } = row;
  const google: AvatarView = { kind: 'google', value: null, color: null, url: avatar_url };

  if (avatar_kind === 'character' && (CHARACTER_IDS as readonly string[]).includes(avatar_value ?? '')) {
    return { kind: 'character', value: avatar_value, color: avatar_color, url: null };
  }

  if (avatar_kind === 'emoji' && avatar_value) {
    return { kind: 'emoji', value: avatar_value, color: avatar_color, url: null };
  }

  if (avatar_kind === 'photo' && avatar_value && urls[avatar_value]) {
    return { kind: 'photo', value: avatar_value, color: null, url: urls[avatar_value] };
  }

  return google;
};

const toAccent = (row: ProfileRow): AccentView | null => {
  const { accent, accent_custom } = row;
  const known = ACCENTS.find(value => {
    return value === accent;
  });

  if (!known) {
    return null;
  }

  if (known !== 'custom') {
    return { accent: known, customHex: null };
  }

  const customHex = parseHex(accent_custom);

  return customHex ? { accent: 'custom', customHex } : null;
};

export const toProfileView = (input: ProfileInput): ProfileView => {
  const { row, email, sounds, urls } = input;
  const { display_name, tag, timezone, week_starts_on, sound_id, sound_volume, password_set } = row;

  const customSounds = sounds.map(({ id, name, path, duration_ms }) => {
    return { id, name, durationMs: duration_ms, url: urls[path] ?? null };
  });
  const known =
    (CHIME_IDS as readonly string[]).includes(sound_id) ||
    customSounds.some(({ id }) => {
      return id === sound_id;
    });

  return {
    name: display_name ?? '',
    tag,
    email,
    avatar: toAvatar(row, urls),
    timezone: isKnownZone(timezone) ? modernZone(timezone) : 'UTC',
    weekStartsOn: week_starts_on === 7 ? 7 : 1,
    sound: { id: known ? sound_id : 'bell', volume: Math.min(1, Math.max(0, sound_volume)) },
    customSounds,
    accent: toAccent(row),
    passwordSet: password_set,
  };
};
