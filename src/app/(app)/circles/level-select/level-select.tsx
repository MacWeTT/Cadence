import { useTranslations } from 'next-intl';
import { LEVELS, type Level } from '@/domain/circles';
import './level-select.css';

interface LevelSelectProps {
  id?: string;
  value: Level | 'inherit';
  /** Adds "Same as the circle", which removes a person's own level. */
  allowInherit?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (value: Level | 'inherit') => void;
}

const isChoice = (value: string): value is Level | 'inherit' => {
  return (
    value === 'inherit' ||
    LEVELS.some(level => {
      return level === value;
    })
  );
};

/** The levels in plain words, as a native select so it works with a keyboard and on a phone. */
export const LevelSelect = (props: LevelSelectProps) => {
  const { id, value, allowInherit, disabled, ariaLabel, onChange } = props;

  const t = useTranslations('circles.sharing');

  const onSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;

    if (isChoice(next)) {
      onChange(next);
    }
  };

  return (
    <select
      id={id}
      className="level-select"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={onSelectChange}
    >
      {allowInherit && <option value="inherit">{t('inherit')}</option>}
      {LEVELS.map(level => {
        return (
          <option key={level} value={level}>
            {t(`levels.${level}`)}
          </option>
        );
      })}
    </select>
  );
};
