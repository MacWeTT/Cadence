import { describe, expect, it } from 'vitest';
import { sniffAudio, sniffImage } from '@/lib/file-sniff';

const bytes = (...values: number[]) => {
  return new Uint8Array([...values, ...new Array(16).fill(0)]);
};

const ascii = (text: string) => {
  return [...text].map(c => {
    return c.charCodeAt(0);
  });
};

describe('sniffImage', () => {
  it('recognises PNG, JPEG and WebP by their first bytes', () => {
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImage(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('image/webp');
  });

  it('refuses everything else, including a renamed text file', () => {
    expect(sniffImage(bytes(...ascii('GIF89a')))).toBeNull();
    expect(sniffImage(bytes(...ascii('<svg xmlns=')))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe('sniffAudio', () => {
  it('recognises MP3 (with or without an ID3 tag), WAV and OGG', () => {
    expect(sniffAudio(bytes(...ascii('ID3')))).toBe('audio/mpeg');
    expect(sniffAudio(bytes(0xff, 0xfb, 0x90))).toBe('audio/mpeg');
    expect(sniffAudio(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')))).toBe('audio/wav');
    expect(sniffAudio(bytes(...ascii('OggS')))).toBe('audio/ogg');
  });

  it('refuses a WebP image, text and an empty file', () => {
    expect(sniffAudio(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBeNull();
    expect(sniffAudio(bytes(...ascii('hello')))).toBeNull();
    expect(sniffAudio(new Uint8Array())).toBeNull();
  });
});
