/**
 * Small taps on the phone for the moments that matter: a habit ticked, a reaction given, a switch turned on, a save
 * that failed. They come from the browser's vibration, so they only happen where it exists (Android browsers; iPhone
 * Safari and desktops have none and nothing happens), and never for a person who asked for reduced motion.
 *
 * They are for meaningful moments only (success, a commit, an error), at the instant of the tap and never as
 * decoration, so that each one still means something. Undoing something is quiet.
 */
export type Haptic = 'tick' | 'toggle' | 'success' | 'error';

/** Milliseconds on, off, on. A tick is the shortest, a success a double pulse, an error the longest. */
export const HAPTIC_PATTERNS: Record<Haptic, number | number[]> = {
  tick: 10,
  toggle: 8,
  success: [12, 40, 12],
  error: [30, 60, 30],
};

export interface HapticEnv {
  vibrate: ((pattern: number | number[]) => boolean) | undefined;
  reducedMotion: boolean;
}

/** Plays one kind of tap on the given device, and says whether it did. It never throws. */
export const play = (kind: Haptic, env: HapticEnv): boolean => {
  const { vibrate, reducedMotion } = env;

  if (!vibrate || reducedMotion) {
    return false;
  }

  try {
    return vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    return false;
  }
};

const browserEnv = (): HapticEnv => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { vibrate: undefined, reducedMotion: false };
  }

  return {
    vibrate: typeof navigator.vibrate === 'function' ? navigator.vibrate.bind(navigator) : undefined,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
};

/** A tap on this device now. Call it from the handler of the tap itself, so it lands with what the person sees. */
export const haptic = (kind: Haptic): boolean => {
  return play(kind, browserEnv());
};

/** Ticking the last habit still to do today is a success; any other tick is a tick. */
export const hapticForTick = (todo: readonly { id: string }[], id: string): Haptic => {
  const { length } = todo;
  const [only] = todo;

  return length === 1 && only.id === id ? 'success' : 'tick';
};
