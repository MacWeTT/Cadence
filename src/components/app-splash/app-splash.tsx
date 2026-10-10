'use client';

import { useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { AnimatedLogo } from '../animated-logo/animated-logo';
import './app-splash.css';

const KEY = 'cadence:splash';

const noopSubscribe = () => {
  return () => {};
};

// Decided once per page load, so marking the visit as seen does not remove the splash half-way through.
let decided: boolean | null = null;

const shouldPlay = () => {
  if (decided === null) {
    try {
      decided = !window.sessionStorage.getItem(KEY);
    } catch {
      decided = false; // blocked storage: skip it rather than replay on every page
    }
  }

  return decided;
};

interface SplashState {
  leaving: boolean;
  finished: boolean;
}

/**
 * The first app page of a browser session opens with the logo animation over the page, then it fades away. The login
 * page has its own logo animation, so it counts as the splash having been seen and skips this one.
 */
export const AppSplash = () => {
  const [state, setState] = useState<SplashState>({ leaving: false, finished: false });

  const play = useSyncExternalStore(noopSubscribe, shouldPlay, () => {
    return false;
  });
  const reduceMotion = useReducedMotion();
  const onLogin = usePathname() === '/login';

  useEffect(() => {
    if (play) {
      try {
        window.sessionStorage.setItem(KEY, '1');
      } catch {
        // nothing to remember it in; the splash just plays again next time
      }
    }
  }, [play]);

  if (!play || onLogin || reduceMotion || state.finished) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn('app-splash', state.leaving && 'app-splash--leaving')}
      onTransitionEnd={() => {
        return state.leaving && setState({ leaving: true, finished: true });
      }}
    >
      <AnimatedLogo
        onComplete={() => {
          return setState({ leaving: true, finished: false });
        }}
      />
    </div>
  );
};
