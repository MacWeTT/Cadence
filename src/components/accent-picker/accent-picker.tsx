'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { deriveAccent, parseHex } from '@/lib/accent-color';
import { ACCENT_PRESETS, ACCENT_SWATCH } from '@/lib/appearance';
import { useAppearance } from '@/lib/use-appearance';
import { cn } from '@/lib/utils';
import './accent-picker.css';

const FALLBACK_HEX = '#5a6b3d';

interface AccentPickerState {
  /** What is being typed in the colour code box, until it loses focus. */
  draft: string | null;
}

/** The preset accents, and any colour of your own. The picked colour is adjusted so button text stays readable. */
export const AccentPicker = () => {
  const [state, setState] = useState<AccentPickerState>({ draft: null });

  const t = useTranslations('appearance.accent');

  const { accent, customHex, setAccent, setCustomAccent } = useAppearance();

  const isCustom = accent === 'custom';
  const shown = state.draft ?? customHex ?? '';
  const invalid = state.draft !== null && state.draft !== '' && parseHex(state.draft) === null;
  const derived = isCustom && customHex ? deriveAccent(customHex) : null;

  let adjustedFor: 'light' | 'dark' | null = null;

  if (derived && derived.light !== derived.hex) {
    adjustedFor = 'light';
  } else if (derived && derived.dark !== derived.hex) {
    adjustedFor = 'dark';
  }

  const handleText = (value: string) => {
    setState({ draft: value });

    const parsed = parseHex(value);

    // Only apply a complete code, so typing "#3" does not flash through "#333333".
    if (parsed && (value.length === 4 || value.length === 7)) {
      setCustomAccent(parsed);
    }
  };

  return (
    <fieldset className="accent-picker">
      <legend className="accent-picker__legend">{t('title')}</legend>
      <p className="accent-picker__hint">{t('hint')}</p>
      <div className="accent-picker__swatches">
        {ACCENT_PRESETS.map(key => {
          return (
            <label key={key} className="accent-picker__option">
              <input
                type="radio"
                name="accent"
                value={key}
                checked={accent === key}
                onChange={() => {
                  return setAccent(key);
                }}
                className="accent-picker__input peer"
              />
              <span aria-hidden className="accent-picker__swatch" style={{ backgroundColor: ACCENT_SWATCH[key] }} />
              <span className="sr-only">{t(`names.${key}`)}</span>
            </label>
          );
        })}
      </div>
      <div className="accent-picker__custom">
        <h3 className="accent-picker__custom-title">{t('customTitle')}</h3>
        <div className="accent-picker__custom-row">
          <input
            type="color"
            aria-label={t('pick')}
            value={customHex ?? FALLBACK_HEX}
            onChange={event => {
              setState({ draft: null });
              setCustomAccent(event.target.value);
            }}
            className={cn('accent-picker__color', isCustom && 'accent-picker__color--active')}
          />
          <input
            type="text"
            aria-label={t('hex')}
            aria-invalid={invalid}
            value={shown}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            placeholder={FALLBACK_HEX}
            onChange={event => {
              handleText(event.target.value);
            }}
            onBlur={() => {
              setState({ draft: null });
            }}
            className={cn('accent-picker__hex', invalid && 'accent-picker__hex--invalid')}
          />
        </div>
        {invalid && <p className="accent-picker__error">{t('invalid')}</p>}
        {adjustedFor && <p className="accent-picker__note">{t('adjusted', { mode: adjustedFor })}</p>}
      </div>
    </fieldset>
  );
};
