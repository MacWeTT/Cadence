'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { parseHex } from '@/lib/accent-color';
import { ACCENT_PRESETS, ACCENT_SWATCH } from '@/lib/appearance';
import './hex-color-picker.css';

interface HexColorPickerProps {
  /** The colour now, as #rrggbb. */
  value: string;
  onChange: (hex: string) => void;
}

interface HexColorPickerState {
  /** What is being typed in the colour code box, until it loses focus. */
  draft: string | null;
}

/** The preset colours, then any colour of your own (a picker and a colour code): the same controls as the accent picker. */
export const HexColorPicker = (props: HexColorPickerProps) => {
  const { value, onChange } = props;

  const [state, setState] = useState<HexColorPickerState>({ draft: null });

  const t = useTranslations('profile.avatar');
  const ta = useTranslations('appearance.accent');

  const { draft } = state;
  const custom = !ACCENT_PRESETS.some(preset => {
    return ACCENT_SWATCH[preset] === value;
  });
  const shown = draft ?? value;
  const invalid = draft !== null && draft !== '' && parseHex(draft) === null;

  const onColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({ draft: null });
    onChange(event.target.value);
  };

  const onHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value: typed } = event.target;
    const { length } = typed;
    const parsed = parseHex(typed);

    setState({ draft: typed });

    // Only a complete code is applied, so typing "#3" does not flash through "#333333".
    if (parsed && (length === 4 || length === 7)) {
      onChange(parsed);
    }
  };

  const onHexBlur = () => {
    setState({ draft: null });
  };

  return (
    <div className="hex-color-picker">
      <div className="hex-color-picker__swatches">
        {ACCENT_PRESETS.map(preset => {
          const swatch = ACCENT_SWATCH[preset];

          const onPick = () => {
            setState({ draft: null });
            onChange(swatch);
          };

          return (
            <button
              key={preset}
              type="button"
              aria-label={ta(`names.${preset}`)}
              aria-pressed={value === swatch}
              onClick={onPick}
              className={clsx('hex-color-picker__swatch', value === swatch && 'hex-color-picker__swatch--active')}
              style={{ backgroundColor: swatch }}
            />
          );
        })}
      </div>
      <div className="hex-color-picker__custom">
        <input
          type="color"
          aria-label={t('customColour')}
          value={value}
          onChange={onColorChange}
          className={clsx('hex-color-picker__color', custom && 'hex-color-picker__color--active')}
        />
        <input
          type="text"
          aria-label={t('hex')}
          aria-invalid={invalid}
          value={shown}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          onChange={onHexChange}
          onBlur={onHexBlur}
          className={clsx('hex-color-picker__hex', invalid && 'hex-color-picker__hex--invalid')}
        />
      </div>
    </div>
  );
};
