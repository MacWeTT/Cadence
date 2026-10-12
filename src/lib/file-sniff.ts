/** What a file really is, from its first bytes: the name and the type a browser sends can say anything. */

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean => {
  return signature.every((value, index) => {
    return bytes[offset + index] === value;
  });
};

const text = (value: string): number[] => {
  return [...value].map(c => {
    return c.charCodeAt(0);
  });
};

export const sniffImage = (bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null => {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }

  if (startsWith(bytes, text('RIFF')) && startsWith(bytes, text('WEBP'), 8)) {
    return 'image/webp';
  }

  return null;
};

export const sniffAudio = (bytes: Uint8Array): 'audio/mpeg' | 'audio/wav' | 'audio/ogg' | null => {
  // MP3: an ID3 tag, or an MPEG frame header (eleven set bits).
  if (startsWith(bytes, text('ID3')) || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) {
    return 'audio/mpeg';
  }

  if (startsWith(bytes, text('RIFF')) && startsWith(bytes, text('WAVE'), 8)) {
    return 'audio/wav';
  }

  return startsWith(bytes, text('OggS')) ? 'audio/ogg' : null;
};
