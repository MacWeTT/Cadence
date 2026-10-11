'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { isThemeName } from '@/lib/themes';
import './mode-picker.css';

const MODES = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
] as const;

const noopSubscribe = () => {
  return () => {};
};

/** Light, dark, or follow the device. The colour themes and the accent work in every mode. */
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
