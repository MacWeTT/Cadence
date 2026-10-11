/** The two modes. The colour themes (Paper, Slate, Forest night, ...) are a separate choice, see appearance.ts. */
export const THEMES = ['light', 'dark'] as const;

export type ThemeName = (typeof THEMES)[number];

export const isThemeName = (value: string | undefined): value is ThemeName => {
  return THEMES.some(name => {
    return name === value;
  });
};
