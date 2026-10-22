import type { AvatarInput } from '@/lib/profile-schema';
import type { ProfileView } from '@/server/profile-view';

/** The profile as it will look once an edit succeeds, shown at once while the server is still working. */

export const withName = (view: ProfileView, name: string): ProfileView => {
  return { ...view, name };
};

export const withPasswordSet = (view: ProfileView): ProfileView => {
  return { ...view, passwordSet: true };
};

export const withTag = (view: ProfileView, tag: string): ProfileView => {
  return { ...view, tag };
};

export const withWeekStart = (view: ProfileView, weekStartsOn: 1 | 7): ProfileView => {
  return { ...view, weekStartsOn };
};

export const withTimezone = (view: ProfileView, timezone: string): ProfileView => {
  return { ...view, timezone };
};

export const withAvatar = (view: ProfileView, input: AvatarInput): ProfileView => {
  const { kind, value, color } = input;

  return { ...view, avatar: { kind, value, color, url: null } };
};

/** A photo chosen from a file: drawn from a local link until the stored copy comes back. */
export const withPhoto = (view: ProfileView, localUrl: string): ProfileView => {
  return { ...view, avatar: { kind: 'photo', value: null, color: null, url: localUrl } };
};

export const withSound = (view: ProfileView, sound: { id: string; volume: number }): ProfileView => {
  return { ...view, sound };
};

/** Removing the sound in use puts the Bell back (the database does the same). */
export const withSoundRemoved = (view: ProfileView, soundId: string): ProfileView => {
  const { sound, customSounds } = view;

  return {
    ...view,
    customSounds: customSounds.filter(({ id }) => {
      return id !== soundId;
    }),
    sound: sound.id === soundId ? { ...sound, id: 'bell' } : sound,
  };
};
