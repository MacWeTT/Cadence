import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import './link-row.css';

interface LinkRowProps {
  index: number;
  value: string;
  invalid: boolean;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

/** One link in the habit form: its address, and a button that removes it. */
export const LinkRow = (props: LinkRowProps) => {
  const { index, value, invalid, onChange, onRemove } = props;

  const t = useTranslations('habits.dialog.links');

  const onValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, event.target.value);
  };

  const onRemoveClick = () => {
    onRemove(index);
  };

  return (
    <li className="link-row">
      <Input
        type="url"
        inputMode="url"
        value={value}
        placeholder={t('placeholder')}
        aria-label={t('label', { number: index + 1 })}
        aria-invalid={invalid}
        onChange={onValueChange}
      />
      <button
        type="button"
        aria-label={t('remove', { number: index + 1 })}
        onClick={onRemoveClick}
        className="link-row__remove"
      >
        <X className="link-row__icon" aria-hidden />
      </button>
    </li>
  );
};
