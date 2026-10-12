import { describe, expect, it } from 'vitest';
import { toProfileView, type ProfileRow, type SoundRow } from '@/server/profile-view';

const row: ProfileRow = {
  display_name: 'Manas',
  avatar_url: 'https://example.com/me.png',
  avatar_kind: 'google',
  avatar_value: null,
  avatar_color: null,
  timezone: 'Asia/Calcutta',
  week_starts_on: 1,
  sound_id: 'bell',
  sound_volume: 0.6,
  accent: null,
  accent_custom: null,
};

const clip: SoundRow = {
  id: '3f2b6c3e-1a2b-4c5d-8e9f-0a1b2c3d4e5f',
  name: 'Air horn',
  path: 'u/x.mp3',
  duration_ms: 2000,
};

const view = (over: Partial<ProfileRow> = {}, sounds: SoundRow[] = [], urls: Record<string, string> = {}) => {
  return toProfileView({ row: { ...row, ...over }, email: 'm@test.dev', sounds, urls });
};

describe('toProfileView', () => {
  it('starts everyone on the Google picture, the Bell at 60% and their timezone under its current name', () => {
    expect(view()).toEqual({
      name: 'Manas',
      email: 'm@test.dev',
      avatar: { kind: 'google', value: null, color: null, url: 'https://example.com/me.png' },
      timezone: 'Asia/Kolkata',
      weekStartsOn: 1,
      sound: { id: 'bell', volume: 0.6 },
      customSounds: [],
      accent: null,
    });
  });

  it('reads the accent kept on the account: a preset, or a custom colour, and nothing for anything else', () => {
    expect(view({ accent: 'plum' }).accent).toEqual({ accent: 'plum', customHex: null });
    expect(view({ accent: 'custom', accent_custom: '#336699' }).accent).toEqual({
      accent: 'custom',
      customHex: '#336699',
    });
    expect(view({ accent: 'custom', accent_custom: null }).accent).toBeNull();
    expect(view({ accent: 'neon' }).accent).toBeNull();
  });

  it('shows a character and an emoji with their colour and no picture', () => {
    expect(view({ avatar_kind: 'character', avatar_value: 'alien', avatar_color: '#5a6b3d' }).avatar).toEqual({
      kind: 'character',
      value: 'alien',
      color: '#5a6b3d',
      url: null,
    });
    expect(view({ avatar_kind: 'emoji', avatar_value: '🌱', avatar_color: '#a8512b' }).avatar.value).toBe('🌱');
  });

  it('falls back to the Google picture for an unknown character, an unknown kind or a photo with no link', () => {
    expect(view({ avatar_kind: 'character', avatar_value: 'dragon', avatar_color: '#5a6b3d' }).avatar.kind).toBe(
      'google',
    );
    expect(view({ avatar_kind: 'sticker', avatar_value: 'x' }).avatar.kind).toBe('google');
    expect(view({ avatar_kind: 'photo', avatar_value: 'u/a.png' }).avatar.kind).toBe('google');
  });

  it('shows a photo through its signed link', () => {
    expect(
      view({ avatar_kind: 'photo', avatar_value: 'u/a.png' }, [], { 'u/a.png': 'https://signed/a' }).avatar,
    ).toEqual({
      kind: 'photo',
      value: 'u/a.png',
      color: null,
      url: 'https://signed/a',
    });
  });

  it('lists custom sounds with their signed links, and selects one of them', () => {
    const result = view({ sound_id: clip.id }, [clip], { [clip.path]: 'https://signed/s' });

    expect(result.sound.id).toBe(clip.id);
    expect(result.customSounds).toEqual([{ id: clip.id, name: 'Air horn', durationMs: 2000, url: 'https://signed/s' }]);
  });

  it('plays the Bell when the chosen custom sound is gone, and keeps the volume in range', () => {
    expect(view({ sound_id: clip.id }, []).sound.id).toBe('bell');
    expect(view({ sound_volume: 3 }).sound.volume).toBe(1);
    expect(view({ sound_volume: -1 }).sound.volume).toBe(0);
  });

  it('uses UTC for a timezone that is not listed, Monday unless Sunday is chosen, and an empty name when there is none', () => {
    const result = view({ timezone: 'Nowhere/Land', week_starts_on: 7, display_name: null });

    expect(result).toMatchObject({ timezone: 'UTC', weekStartsOn: 7, name: '' });
    expect(view({ week_starts_on: 3 }).weekStartsOn).toBe(1);
  });
});
