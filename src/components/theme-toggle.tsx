'use client';

import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  // The theme is only known in the browser; render a neutral button until then to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const isDark = mounted && resolvedTheme === 'dark';
  const label = !mounted ? 'Toggle theme' : isDark ? 'Switch to light theme' : 'Switch to dark theme';

  function toggle() {
    // Colours glide between the two themes instead of snapping: the class turns on a short transition (see globals.css)
    // for just the moment of the switch, so it never slows down ordinary hover effects.
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setTheme(isDark ? 'light' : 'dark');
    window.setTimeout(() => root.classList.remove('theme-transition'), 400);
  }

  const Icon = isDark ? Sun : Moon;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!mounted}
      onClick={toggle}
      className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-line text-ink-muted transition-colors hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-clay"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          aria-hidden
          className="flex"
          initial={reduceMotion ? false : { rotate: -90, scale: 0.5, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={reduceMotion ? undefined : { rotate: 90, scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Icon className="size-4.5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
