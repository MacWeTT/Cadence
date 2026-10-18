import type { FocusState } from '@/server/focus-view';

/** The focus state as it will be once the running session is stopped, so Stop takes effect before the server answers. */
export const withoutRunning = (state: FocusState | undefined): FocusState | undefined => {
  return state ? { ...state, running: null } : state;
};
