'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import './password-input.css';
import { Tip } from '@/components/tip/tip';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>;

/** A password field with a button that shows what was typed, and hides it again. */
export const PasswordInput = (props: PasswordInputProps) => {
  const [shown, setShown] = useState(false);

  const t = useTranslations('common.password');

  const onToggle = () => {
    setShown(!shown);
  };

  return (
    <span className="password-input">
      <Input {...props} type={shown ? 'text' : 'password'} className="password-input__field" />
      <Tip label={shown ? t('hide') : t('show')}>
        <button
          type="button"
          className="password-input__toggle"
          aria-label={shown ? t('hide') : t('show')}
          aria-pressed={shown}
          onClick={onToggle}
        >
          {shown ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      </Tip>
    </span>
  );
};
