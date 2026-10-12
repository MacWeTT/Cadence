'use client';

import { createContext, useContext } from 'react';
import type { FocusPlan } from '@/domain/focus';
import type { SessionView } from '@/lib/focus-clock';
import type { StartInput } from '@/components/focus-host/use-focus';
import type { FocusResult } from '@/server/focus';
import type { FocusSession } from '@/server/focus-view';

/** A habit a session can start on. */
export interface FocusTarget {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface FocusApi {
  /** The running session, if any. */
  session: FocusSession | null;
  view: SessionView | null;
  /** The numbers last used on each habit. */
  plans: Record<string, FocusPlan>;
  /** The sound last chosen on each habit (a habit last run on the default has none). */
  sounds: Record<string, string>;
  panelOpen: boolean;
  /** The habit the setup panel is for (when nothing is running). */
  target: FocusTarget | null;
  /** The finished session waiting for "I did it", if any. */
  result: (FocusResult & { name: string; ticked: boolean }) | null;
  pending: boolean;
  error: string | null;
  /** The "I did it" box on the ending panel: ticked unless the person unticks it. */
  didIt: boolean;
  setDidIt: (didIt: boolean) => void;
  /** The "Count this time in focus" box: ticked unless the person unticks it; unticked, the session is not kept. */
  countIt: boolean;
  setCountIt: (countIt: boolean) => void;
  openFor: (target: FocusTarget) => void;
  openRunning: () => void;
  closePanel: () => void;
  start: (input: StartInput) => void;
  stop: () => void;
  skip: () => void;
  /** Closes the ending panel, ticking the habit when "I did it" is ticked. */
  confirm: () => void;
}

export const FocusContext = createContext<FocusApi | null>(null);

export const useFocusApi = (): FocusApi => {
  const api = useContext(FocusContext);

  if (!api) {
    throw new Error('useFocusApi needs a FocusHost above it');
  }

  return api;
};
