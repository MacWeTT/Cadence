'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { cn } from '@/lib/utils';
import { AnimatedLogo } from '@/components/animated-logo/animated-logo';
import './app-splash.css';

const KEY = 'cadence:splash';
const DESCRIPTION_MS = 1500; // how long the description stays once it is there

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
  /** True once the logo is whole and the description fades in under it. */
  described: boolean;
  leaving: boolean;
  finished: boolean;
}

/**
 * The first app page of a browser session opens with the logo animation over the page, then the app's description fades
 * in under it, and then the whole splash fades away. The login
 * page has its own logo animation, so it counts as the splash having been seen and skips this one.
 */
export const AppSplash = () => {
  const [state, setState] = useState<SplashState>({ described: false, leaving: false, finished: false });

  const play = useSyncExternalStore(noopSubscribe, shouldPlay, () => {
    return false;
  });
  const t = useTranslations('common');
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

  // Let the description be read for a moment, then the splash goes.
  useEffect(() => {
    if (!state.described) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState(current => {
        return { ...current, leaving: true };
      });
    }, DESCRIPTION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state.described]);

  const onTransitionEnd = (event: React.TransitionEvent) => {
    if (state.leaving && event.target === event.currentTarget) {
      setState(current => {
        return { ...current, finished: true };
      });
    }
  };

  const onLogoComplete = () => {
    setState(current => {
      return { ...current, described: true };
    });
  };

  if (!play || onLogin || reduceMotion || state.finished) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn('app-splash', state.leaving && 'app-splash--leaving')}
      onTransitionEnd={onTransitionEnd}
    >
      <AnimatedLogo onComplete={onLogoComplete} />
      <p className={cn('app-splash__tagline', state.described && 'app-splash__tagline--shown')}>{t('tagline')}</p>
    </div>
  );
};
