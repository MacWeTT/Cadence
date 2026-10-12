import { describe, expect, it } from 'vitest';
import {
  accentInputSchema,
  avatarInputSchema,
  checkPhotoFile,
  checkSoundFile,
  nameInputSchema,
  soundInputSchema,
  soundNameFromFile,
  timezoneInputSchema,
  weekStartInputSchema,
} from '@/lib/profile-schema';

describe('nameInputSchema', () => {
  it('trims the name', () => {
    expect(nameInputSchema.safeParse({ name: '  Manas  ' })).toMatchObject({ success: true, data: { name: 'Manas' } });
  });

  it('refuses an empty name and a name over 50 characters', () => {
    expect(nameInputSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(nameInputSchema.safeParse({ name: 'x'.repeat(51) }).success).toBe(false);
    expect(nameInputSchema.safeParse({ name: 'x'.repeat(50) }).success).toBe(true);
  });
});

describe('weekStartInputSchema', () => {
  it('accepts Monday (1) and Sunday (7) only', () => {
    expect(weekStartInputSchema.safeParse({ weekStartsOn: 1 }).success).toBe(true);
    expect(weekStartInputSchema.safeParse({ weekStartsOn: 7 }).success).toBe(true);
    expect(weekStartInputSchema.safeParse({ weekStartsOn: 3 }).success).toBe(false);
    expect(weekStartInputSchema.safeParse({ weekStartsOn: '1' }).success).toBe(false);
  });
});

describe('timezoneInputSchema', () => {
  it('accepts a listed zone and saves it under its current name', () => {
    expect(timezoneInputSchema.safeParse({ timezone: 'Asia/Tokyo' })).toMatchObject({
      success: true,
      data: { timezone: 'Asia/Tokyo' },
    });
    expect(timezoneInputSchema.safeParse({ timezone: 'Asia/Calcutta' })).toMatchObject({
      success: true,
      data: { timezone: 'Asia/Kolkata' },
    });
  });

  it('refuses anything that is not a listed zone', () => {
    expect(timezoneInputSchema.safeParse({ timezone: 'Mars/Olympus_Mons' }).success).toBe(false);
    expect(timezoneInputSchema.safeParse({ timezone: 'los angeles' }).success).toBe(false);
  });
});

describe('avatarInputSchema', () => {
  it('accepts a character with a colour and normalises the colour', () => {
    expect(avatarInputSchema.safeParse({ kind: 'character', value: 'alien', color: '#ABC' })).toMatchObject({
      success: true,
      data: { kind: 'character', value: 'alien', color: '#aabbcc' },
    });
  });

  it('accepts one emoji with a colour', () => {
    expect(avatarInputSchema.safeParse({ kind: 'emoji', value: '🌱', color: '#5a6b3d' }).success).toBe(true);
  });

  it('refuses an unknown character, two emoji, text, and a bad colour', () => {
    expect(avatarInputSchema.safeParse({ kind: 'character', value: 'dragon', color: '#5a6b3d' }).success).toBe(false);
    expect(avatarInputSchema.safeParse({ kind: 'emoji', value: '🌱🔥', color: '#5a6b3d' }).success).toBe(false);
    expect(avatarInputSchema.safeParse({ kind: 'emoji', value: 'a', color: '#5a6b3d' }).success).toBe(false);
    expect(avatarInputSchema.safeParse({ kind: 'character', value: 'alien', color: 'green' }).success).toBe(false);
  });

  it('does not take a photo or the Google picture: those are set by their own paths', () => {
    expect(avatarInputSchema.safeParse({ kind: 'photo', value: 'a/b.png' }).success).toBe(false);
    expect(avatarInputSchema.safeParse({ kind: 'google' }).success).toBe(false);
  });
});

describe('accentInputSchema', () => {
  it('accepts a preset, with no colour', () => {
    expect(accentInputSchema.safeParse({ accent: 'teal', customHex: null })).toMatchObject({
      success: true,
      data: { accent: 'teal', customHex: null },
    });
  });

  it('drops a colour sent with a preset, and normalises a custom colour', () => {
    expect(accentInputSchema.safeParse({ accent: 'sky', customHex: '#123456' })).toMatchObject({
      data: { accent: 'sky', customHex: null },
    });
    expect(accentInputSchema.safeParse({ accent: 'custom', customHex: '#ABC' })).toMatchObject({
      success: true,
      data: { accent: 'custom', customHex: '#aabbcc' },
    });
  });

  it('refuses an unknown accent and a custom accent with no valid colour', () => {
    expect(accentInputSchema.safeParse({ accent: 'neon', customHex: null }).success).toBe(false);
    expect(accentInputSchema.safeParse({ accent: 'custom', customHex: null }).success).toBe(false);
    expect(accentInputSchema.safeParse({ accent: 'custom', customHex: 'green' }).success).toBe(false);
  });
});

describe('soundInputSchema', () => {
  it('accepts a built-in sound or a custom sound id, with a volume from 0 to 1', () => {
    expect(soundInputSchema.safeParse({ id: 'marimba', volume: 0.6 }).success).toBe(true);
    expect(soundInputSchema.safeParse({ id: '3f2b6c3e-1a2b-4c5d-8e9f-0a1b2c3d4e5f', volume: 0 }).success).toBe(true);
  });

  it('refuses an unknown name and a volume out of range', () => {
    expect(soundInputSchema.safeParse({ id: 'airhorn', volume: 0.5 }).success).toBe(false);
    expect(soundInputSchema.safeParse({ id: 'bell', volume: 1.2 }).success).toBe(false);
    expect(soundInputSchema.safeParse({ id: 'bell', volume: -0.1 }).success).toBe(false);
  });
});

describe('checkPhotoFile', () => {
  it('accepts JPEG, PNG and WebP up to 2 MB, whatever the dimensions', () => {
    expect(checkPhotoFile({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull();
    expect(checkPhotoFile({ type: 'image/jpeg', size: 1 })).toBeNull();
    expect(checkPhotoFile({ type: 'image/webp', size: 500 })).toBeNull();
  });

  it('names the problem for a wrong type or a file over 2 MB', () => {
    expect(checkPhotoFile({ type: 'image/gif', size: 100 })).toBe('photoType');
    expect(checkPhotoFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBe('photoTooBig');
    expect(checkPhotoFile({ type: 'image/png', size: 0 })).toBe('photoType');
  });
});

describe('checkSoundFile', () => {
  const ok = { type: 'audio/mpeg', size: 100 * 1024, durationMs: 3000 };

  it('accepts MP3, WAV and OGG up to 500 KB and 5 seconds', () => {
    expect(checkSoundFile(ok)).toBeNull();
    expect(checkSoundFile({ type: 'audio/wav', size: 500 * 1024, durationMs: 5000 })).toBeNull();
    expect(checkSoundFile({ ...ok, type: 'audio/ogg' })).toBeNull();
  });

  it('names the problem: type, size, then length', () => {
    expect(checkSoundFile({ ...ok, type: 'audio/aac' })).toBe('soundType');
    expect(checkSoundFile({ ...ok, size: 500 * 1024 + 1 })).toBe('soundTooBig');
    expect(checkSoundFile({ ...ok, durationMs: 5001 })).toBe('soundTooLong');
    expect(checkSoundFile({ ...ok, durationMs: 0 })).toBe('soundTooLong');
  });

  it('does not accept a missing or non-numeric length', () => {
    expect(checkSoundFile({ ...ok, durationMs: Number.NaN })).toBe('soundTooLong');
  });
});

describe('soundNameFromFile', () => {
  it('drops the extension and tidies the rest', () => {
    expect(soundNameFromFile('air-horn.mp3')).toBe('air-horn');
    expect(soundNameFromFile('  my.clip.final.wav ')).toBe('my.clip.final');
  });

  it('keeps it to 40 characters and never returns an empty name', () => {
    expect(soundNameFromFile(`${'a'.repeat(60)}.ogg`)).toHaveLength(40);
    expect(soundNameFromFile('.mp3')).toBe('Sound');
    expect(soundNameFromFile('')).toBe('Sound');
  });
});
