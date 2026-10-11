'use client';

import { useTranslations } from 'next-intl';
import { PALETTES, PALETTE_PREVIEW, parseChoice } from '@/lib/appearance';
import { useAppearance } from '@/lib/use-appearance';
import './theme-picker.css';

/** One card per colour theme, each showing the page and a card in its light and dark versions. */
export const ThemePicker = () => {
  const t = useTranslations('appearance.theme');

  const { palette, setPalette } = useAppearance();

  const onThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPalette(parseChoice('palette', event.target.value));
  };

  return (
    <fieldset className="theme-picker">
      <legend className="theme-picker__legend">{t('title')}</legend>
      <div className="theme-picker__options">
        {PALETTES.map(key => {
          const { light, dark } = PALETTE_PREVIEW[key];

          return (
            <label key={key} className="theme-picker__option">
              <input
                type="radio"
                name="theme"
                value={key}
                checked={palette === key}
                onChange={onThemeChange}
                className="theme-picker__input peer"
              />
              <span className="theme-picker__card">
                <span aria-hidden className="theme-picker__preview">
                  {[light, dark].map(({ bg, surface, ink }, index) => {
                    return (
                      <span key={index} className="theme-picker__half" style={{ backgroundColor: bg }}>
                        <span className="theme-picker__sample" style={{ backgroundColor: surface }}>
                          <span className="theme-picker__line" style={{ backgroundColor: ink }} />
                          <span
                            className="theme-picker__line theme-picker__line--short"
                            style={{ backgroundColor: ink }}
                          />
                        </span>
                      </span>
                    );
                  })}
                </span>
                <span className="theme-picker__name">{t(`names.${key}`)}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
