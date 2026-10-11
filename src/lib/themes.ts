/** One light theme and two dark ones. "dark" is Slate: it keeps the name next-themes (and saved choices) already use. */
export const THEMES = ['light', 'dark', 'forest'] as const;

export type ThemeName = (typeof THEMES)[number];

export const isThemeName = (value: string | undefined): value is ThemeName => {
  return THEMES.some(name => {
    return name === value;
  });
};
