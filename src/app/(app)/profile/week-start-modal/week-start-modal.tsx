'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useUpdateWeekStart } from '@/app/(app)/profile/use-profile';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import './week-start-modal.css';

interface WeekStartModalProps {
  weekStartsOn: 1 | 7;
  onClose: () => void;
}

const OPTIONS = [
  { value: 1, key: 'monday' },
  { value: 7, key: 'sunday' },
] as const;

export const WeekStartModal = (props: WeekStartModalProps) => {
  const { weekStartsOn, onClose } = props;

  const [form, setForm] = useState<{ value: 1 | 7 }>({ value: weekStartsOn });

  const t = useTranslations('profile');
  const update = useUpdateWeekStart();

  const { value } = form;

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ value: event.target.value === '7' ? 7 : 1 });
  };

  const onSave = () => {
    update.mutate(value);
    onClose();
  };

  return (
    <SettingModal title={t('weekStart.title')} saveDisabled={value === weekStartsOn} onSave={onSave} onClose={onClose}>
      <fieldset className="week-start-modal">
        <legend className="sr-only">{t('weekStart.title')}</legend>
        {OPTIONS.map(({ value: optionValue, key }) => {
          return (
            <label key={optionValue} className="week-start-modal__option">
              <input
                type="radio"
                name="week-start"
                value={optionValue}
                checked={value === optionValue}
                onChange={onChange}
                className="week-start-modal__input"
              />
              {t(`weekdays.${key}`)}
            </label>
          );
        })}
      </fieldset>
    </SettingModal>
  );
};
