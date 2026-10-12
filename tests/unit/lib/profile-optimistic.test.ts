import { describe, expect, it } from 'vitest';
import {
  withAvatar,
  withName,
  withPhoto,
  withSound,
  withSoundRemoved,
  withTimezone,
  withWeekStart,
} from '@/lib/profile-optimistic';
import type { ProfileView } from '@/server/profile-view';

const clip = { id: '3f2b6c3e-1a2b-4c5d-8e9f-0a1b2c3d4e5f', name: 'Air horn', durationMs: 2000, url: 'https://s/1' };

const view: ProfileView = {
  name: 'Manas',
  email: 'm@test.dev',
  avatar: { kind: 'google', value: null, color: null, url: 'https://g/me.png' },
  timezone: 'Asia/Kolkata',
  weekStartsOn: 1,
  sound: { id: 'bell', volume: 0.6 },
  customSounds: [clip],
  accent: null,
};

describe('the profile as it looks before the server answers', () => {
  it('changes the name, the week start and the timezone, and nothing else', () => {
    expect(withName(view, 'Mac')).toEqual({ ...view, name: 'Mac' });
    expect(withWeekStart(view, 7)).toEqual({ ...view, weekStartsOn: 7 });
    expect(withTimezone(view, 'Europe/London')).toEqual({ ...view, timezone: 'Europe/London' });
  });

  it('shows a character or an emoji with its colour and no picture', () => {
    expect(withAvatar(view, { kind: 'character', value: 'robot', color: '#5a6b3d' }).avatar).toEqual({
      kind: 'character',
      value: 'robot',
      color: '#5a6b3d',
      url: null,
    });
  });

  it('shows a chosen photo from a local link until the server has stored it', () => {
    expect(withPhoto(view, 'blob:local').avatar).toEqual({
      kind: 'photo',
      value: null,
      color: null,
      url: 'blob:local',
    });
  });

  it('switches the sound and the volume together', () => {
    expect(withSound(view, { id: clip.id, volume: 0.3 }).sound).toEqual({ id: clip.id, volume: 0.3 });
  });

  it('removes a custom sound, and puts the Bell back if it was the one in use', () => {
    const using = withSound(view, { id: clip.id, volume: 0.3 });
    const removed = withSoundRemoved(using, clip.id);

    expect(removed.customSounds).toEqual([]);
    expect(removed.sound).toEqual({ id: 'bell', volume: 0.3 });
    expect(withSoundRemoved(view, clip.id).sound).toEqual({ id: 'bell', volume: 0.6 });
  });
});
