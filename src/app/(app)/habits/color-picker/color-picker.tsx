import { COLOR_KEYS, habitColor, type ColorKey } from '@/lib/palette';
import './color-picker.css';

interface ColorPickerProps {
  value: ColorKey;
  onChange: (color: ColorKey) => void;
}

/** A row of colour swatches, one radio button each. */
export const ColorPicker = (props: ColorPickerProps) => {
  const { value, onChange } = props;

  return (
    <fieldset>
      <legend className="color-picker__legend">Color</legend>
      <div className="color-picker__swatches">
        {COLOR_KEYS.map(key => {
          return (
            <label key={key} className="color-picker__option">
              <input
                type="radio"
                name="color"
                value={key}
                checked={value === key}
                onChange={() => {
                  return onChange(key);
                }}
                className="color-picker__input peer"
              />
              <span aria-hidden className="color-picker__swatch" style={{ backgroundColor: habitColor(key) }} />
              <span className="sr-only">{key}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
