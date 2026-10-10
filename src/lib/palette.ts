/** Habit colors. `PALETTE` must match the `--habit-*` variables in globals.css (a test checks it). */
export const COLOR_KEYS = ['moss', 'clay', 'ochre', 'rose', 'plum', 'teal', 'sky', 'slate'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const PALETTE: Record<'light' | 'dark', Record<ColorKey, string>> = {
  light: {
    moss: '#6c7d45',
    clay: '#b8643c',
    ochre: '#ad7f1f', // darker than the spec's #c79a3b, which was only 2.3:1 on the surface
    rose: '#b5576a',
    plum: '#7d5a8c',
    teal: '#3f8079',
    sky: '#4f7fa6',
    slate: '#6f6a63',
  },
  dark: {
    moss: '#9bb06a',
    clay: '#e0905f',
    ochre: '#d9b25a',
    rose: '#d98aa0',
    plum: '#b99ad0',
    teal: '#6fb5ac',
    sky: '#86b0d6',
    slate: '#a8a39b',
  },
};

export const habitColor = (key: ColorKey): string => {
  return `var(--habit-${key})`;
};
