'use client';

import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import './theme-toggle.css';

const noopSubscribe = () => {
  return () => {};
};

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const t = useTranslations('common.theme');

  // The theme is only known in the browser; render a neutral button until then to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => {
      return true;
    },
    () => {
      return false;
    },
  );

  const isDark = mounted && resolvedTheme === 'dark';
  const label = !mounted ? t('toggle') : isDark ? t('toLight') : t('toDark');

  const toggle = () => {
    // Colours glide between the two themes instead of snapping: the class turns on a short transition (see globals.css)
    // for just the moment of the switch, so it never slows down ordinary hover effects.
    const root = document.documentElement;

    root.classList.add('theme-transition');
    setTheme(isDark ? 'light' : 'dark');
    window.setTimeout(() => {
      return root.classList.remove('theme-transition');
    }, 400);
  };

  const Icon = isDark ? Sun : Moon;

  return (
    <button type="button" aria-label={label} disabled={!mounted} onClick={toggle} className="theme-toggle">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          aria-hidden
          className="theme-toggle__glyph"
          initial={reduceMotion ? false : { rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={reduceMotion ? undefined : { rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Icon className="theme-toggle__icon" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
};
