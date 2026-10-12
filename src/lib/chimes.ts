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
  id: ChimeId;
  volume: number;
}

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

const DEFAULT_CHOICE: ChimeChoice = { id: 'bell', volume: 0.6 };

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

export const playChime = (choice: ChimeChoice, cue: Cue): void => {
  const { id, volume } = choice;

  if (!context) {
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
