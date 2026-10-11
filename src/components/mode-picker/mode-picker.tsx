'use client';

import { Monitor, Moon, Sun, TreePine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { isThemeName } from '@/lib/themes';
import './mode-picker.css';

/** The app's three base themes (Paper, Slate, Forest night), plus following the device. */
const MODES = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'forest', Icon: TreePine },
  { value: 'system', Icon: Monitor },
] as const;

const noopSubscribe = () => {
  return () => {};
};

/** Which base theme to use. The colour themes and the accent work on top of every one of them. */
export const ModePicker = () => {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('appearance.mode');

  // The saved mode is only known in the browser; show nothing selected until then to avoid a hydration mismatch.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => {
      return true;
    },
    () => {
      return false;
    },
  );

  const onModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    if (isThemeName(value) || value === 'system') {
      setTheme(value);
    }
  };

  return (
    <fieldset className="mode-picker">
      <legend className="mode-picker__legend">{t('title')}</legend>
      <div className="mode-picker__options">
        {MODES.map(({ value, Icon }) => {
          return (
            <label key={value} className="mode-picker__option">
              <input
                type="radio"
                name="mode"
                value={value}
                checked={mounted && theme === value}
                onChange={onModeChange}
                className="mode-picker__input peer"
              />
              <span className="mode-picker__card">
                <Icon aria-hidden className="mode-picker__icon" />
                {t(value)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
