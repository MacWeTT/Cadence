// Chimes are small recipes played with the Web Audio API: no sound files to ship or license.
export const CHIME_IDS = ['bell', 'marimba', 'wood', 'beep', 'rising', 'silent'] as const;

export type ChimeId = (typeof CHIME_IDS)[number];
export type Cue = 'focus' | 'break' | 'done';

export interface Note {
  freq: number;
  /** Seconds after the chime starts. */
  at: number;
  /** Seconds the note rings. */
  length: number;
  wave: OscillatorType;
  gain: number;
}

export interface ChimeChoice {
  /** A built-in sound name, or the id of one of the person's own sounds (then `url` is where to fetch it). */
  id: string;
  volume: number;
  url?: string | null;
}

export const isChimeId = (id: string): id is ChimeId => {
  return (CHIME_IDS as readonly string[]).includes(id);
};

const RECIPES: Record<Exclude<ChimeId, 'silent'>, Note[]> = {
  bell: [
    { freq: 880, at: 0, length: 1.2, wave: 'sine', gain: 0.5 },
    { freq: 1760, at: 0, length: 0.6, wave: 'sine', gain: 0.15 },
  ],
  marimba: [
    { freq: 523, at: 0, length: 0.5, wave: 'triangle', gain: 0.6 },
    { freq: 659, at: 0.18, length: 0.6, wave: 'triangle', gain: 0.6 },
  ],
  wood: [{ freq: 400, at: 0, length: 0.15, wave: 'square', gain: 0.25 }],
  beep: [{ freq: 660, at: 0, length: 0.4, wave: 'sine', gain: 0.4 }],
  rising: [
    { freq: 440, at: 0, length: 0.3, wave: 'sine', gain: 0.4 },
    { freq: 554, at: 0.25, length: 0.3, wave: 'sine', gain: 0.4 },
    { freq: 659, at: 0.5, length: 0.7, wave: 'sine', gain: 0.4 },
  ],
};

export const DEFAULT_CHOICE: ChimeChoice = { id: 'bell', volume: 0.6 };

/** The break cue is the same chime a little higher and shorter, so the two sound different without choosing twice. */
const BREAK_PITCH = 1.25;
const BREAK_LENGTH = 0.7;

/** The completion cue: the chime's first note three times, each step higher, so a finished session sounds like arriving. */
const DONE_STEPS = [1, 1.25, 1.5];
const DONE_GAP = 0.3;

export const recipeFor = (id: ChimeId, cue: Cue): Note[] => {
  if (id === 'silent') {
    return [];
  }

  if (cue === 'done') {
    const [first] = RECIPES[id];
    const { freq, length } = first;

    return DONE_STEPS.map((step, index) => {
      const last = index === DONE_STEPS.length - 1;

      return { ...first, freq: freq * step, at: index * DONE_GAP, length: Math.min(length, last ? 0.7 : 0.4) };
    });
  }

  return RECIPES[id].map(note => {
    const { freq, at, length } = note;

    return cue === 'break'
      ? { ...note, freq: freq * BREAK_PITCH, at: at * BREAK_LENGTH, length: length * BREAK_LENGTH }
      : note;
  });
};

export const recipeLength = (notes: Note[]): number => {
  return Math.max(
    0,
    ...notes.map(({ at, length }) => {
      return at + length;
    }),
  );
};

/**
 * The sound for one focus session. The profile's sound is the default; a session may carry its own (a built-in sound, or one
 * of the person's own with its link), played at the default's volume. One that has since been removed falls back to the default.
 */
export const sessionChoice = (
  override: string | null,
  base: ChimeChoice,
  customs: { id: string; url: string | null }[],
): ChimeChoice => {
  if (override === null) {
    return base;
  }

  const { volume } = base;

  if (isChimeId(override)) {
    return { id: override, volume, url: null };
  }

  const custom = customs.find(({ id }) => {
    return id === override;
  });

  return custom ? { id: override, volume, url: custom.url } : base;
};

export const parseChoice = (raw: string): ChimeChoice => {
  try {
    const { id, volume } = JSON.parse(raw) as { id?: unknown; volume?: unknown };

    if (!CHIME_IDS.includes(id as ChimeId) || typeof volume !== 'number') {
      return DEFAULT_CHOICE;
    }

    return { id: id as ChimeId, volume: Math.min(1, Math.max(0, volume)) };
  } catch {
    return DEFAULT_CHOICE;
  }
};

let context: AudioContext | null = null;

/** Browsers only play sound after a touch: call this from the Start tap so later chimes are allowed. */
export const unlockAudio = (): void => {
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    // no Web Audio here: the notification and the tab title are the fallback
  }
};

const samples = new Map<string, Promise<AudioBuffer>>();

const loadSample = (url: string, audio: AudioContext): Promise<AudioBuffer> => {
  let sample = samples.get(url);

  if (!sample) {
    sample = fetch(url)
      .then(response => {
        return response.arrayBuffer();
      })
      .then(bytes => {
        return audio.decodeAudioData(bytes);
      });
    samples.set(url, sample);
    // A failed load is forgotten, so the next cue tries again.
    sample.catch(() => {
      samples.delete(url);
    });
  }

  return sample;
};

/** A person's own sound, played like a built-in: higher for a break, three times, each higher, when a session is done. */
const playSample = async (url: string, volume: number, cue: Cue): Promise<void> => {
  const audio = context;

  if (!audio) {
    return;
  }

  try {
    const buffer = await loadSample(url, audio);
    const rates = cue === 'done' ? DONE_STEPS : [cue === 'break' ? BREAK_PITCH : 1];
    const { currentTime, destination } = audio;
    let start = currentTime;

    for (const rate of rates) {
      const source = audio.createBufferSource();
      const amp = audio.createGain();

      source.buffer = buffer;
      source.playbackRate.value = rate;
      amp.gain.value = volume;
      source.connect(amp).connect(destination);
      source.start(start);
      start += buffer.duration / rate + 0.1;
    }
  } catch {
    // the file could not be fetched or decoded: the notification and the tab title are the fallback
  }
};

export const playChime = (choice: ChimeChoice, cue: Cue): void => {
  const { id, volume, url } = choice;

  if (!context) {
    return;
  }

  if (!isChimeId(id)) {
    if (url) {
      void playSample(url, volume, cue);
    }

    return;
  }

  const { currentTime, destination } = context;

  for (const { freq, at, length, wave, gain } of recipeFor(id, cue)) {
    const osc = context.createOscillator();
    const amp = context.createGain();
    const from = currentTime + at;
    const { gain: level } = amp;

    osc.type = wave;
    osc.frequency.value = freq;
    level.setValueAtTime(0.0001, from);
    level.exponentialRampToValueAtTime(Math.max(0.0001, gain * volume), from + 0.01);
    level.exponentialRampToValueAtTime(0.0001, from + length);
    osc.connect(amp).connect(destination);
    osc.start(from);
    osc.stop(from + length + 0.05);
  }
};
