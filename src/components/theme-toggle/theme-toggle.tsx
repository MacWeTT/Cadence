'use client';

import { Moon, Sun, TreePine } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import './theme-toggle.css';

/** One light theme and two dark ones. "dark" is Slate: it keeps the name next-themes (and saved choices) already use. */
const THEMES = ['light', 'dark', 'forest'] as const;

type ThemeName = (typeof THEMES)[number];

const ICONS = { light: Sun, dark: Moon, forest: TreePine } as const;

const isThemeName = (value: string | undefined): value is ThemeName => {
  return THEMES.some(name => {
    return name === value;
  });
};

const noopSubscribe = () => {
  return () => {};
};

/** The button in the top bar that opens the theme menu: the light theme, and the two dark ones. */
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

  const current: ThemeName = mounted && isThemeName(resolvedTheme) ? resolvedTheme : 'light';
  const Icon = mounted ? ICONS[current] : Moon;

  const onThemeChange = (value: string) => {
    if (!isThemeName(value)) {
      return;
    }

    // Colours glide between the themes instead of snapping: the class turns on a short transition (see globals.css)
    // for just the moment of the switch, so it never slows down ordinary hover effects.
    const root = document.documentElement;

    root.classList.add('theme-transition');
    setTheme(value);
    window.setTimeout(() => {
      return root.classList.remove('theme-transition');
    }, 400);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t('choose')} disabled={!mounted} className="theme-toggle">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current}
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={onThemeChange}>
          <DropdownMenuLabel>{t('light')}</DropdownMenuLabel>
          <DropdownMenuRadioItem value="light">{t('names.light')}</DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t('dark')}</DropdownMenuLabel>
          <DropdownMenuRadioItem value="dark">{t('names.dark')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="forest">{t('names.forest')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
