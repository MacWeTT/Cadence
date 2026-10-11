'use client';

import { Palette as PaletteIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ACCENTS, ACCENT_SWATCH, PALETTES, PALETTE_PREVIEW } from '@/lib/appearance';
import { useAppearance } from '@/lib/use-appearance';
import './appearance-menu.css';

/** A button in the top bar that opens the theme and accent pickers. Light/dark stays on its own toggle. */
export const AppearanceMenu = () => {
  const t = useTranslations('common.appearance');

  const { palette, accent, setPalette, setAccent } = useAppearance();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={t('open')} className="appearance-menu__trigger">
          <PaletteIcon aria-hidden className="appearance-menu__icon" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="appearance-menu__content">
        <fieldset>
          <legend className="appearance-menu__legend">{t('theme')}</legend>
          <div className="appearance-menu__themes">
            {PALETTES.map(key => {
              return (
                <label key={key} className="appearance-menu__option">
                  <input
                    type="radio"
                    name="palette"
                    value={key}
                    checked={palette === key}
                    onChange={() => {
                      return setPalette(key);
                    }}
                    className="appearance-menu__input peer"
                  />
                  <span className="appearance-menu__theme">
                    <span
                      aria-hidden
                      className="appearance-menu__chip"
                      style={{ backgroundColor: PALETTE_PREVIEW[key].bg }}
                    >
                      <span
                        className="appearance-menu__chip-surface"
                        style={{ backgroundColor: PALETTE_PREVIEW[key].surface }}
                      />
                    </span>
                    {t(`themes.${key}`)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="appearance-menu__legend">{t('accent')}</legend>
          <div className="appearance-menu__accents">
            {ACCENTS.map(key => {
              return (
                <label key={key} className="appearance-menu__option">
                  <input
                    type="radio"
                    name="accent"
                    value={key}
                    checked={accent === key}
                    onChange={() => {
                      return setAccent(key);
                    }}
                    className="appearance-menu__input peer"
                  />
                  <span
                    aria-hidden
                    className="appearance-menu__swatch"
                    style={{ backgroundColor: ACCENT_SWATCH[key] }}
                  />
                  <span className="sr-only">{t(`accents.${key}`)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  );
};
