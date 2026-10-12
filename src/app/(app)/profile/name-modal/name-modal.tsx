'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useUpdateName } from '@/app/(app)/profile/use-profile';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NAME_MAX } from '@/lib/profile-schema';

interface NameModalProps {
  name: string;
  onClose: () => void;
}

export const NameModal = (props: NameModalProps) => {
  const { name, onClose } = props;

  const [form, setForm] = useState({ name });

  const t = useTranslations('profile.name');
  const update = useUpdateName();

  const { name: draft } = form;
  const trimmed = draft.trim();

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ name: event.target.value });
  };

  const onSave = () => {
    update.mutate(trimmed);
    onClose();
  };

  return (
    <SettingModal
      title={t('title')}
      saveDisabled={trimmed === '' || trimmed === name}
      onSave={onSave}
      onClose={onClose}
    >
      <Label htmlFor="profile-name">{t('label')}</Label>
      <Input id="profile-name" value={draft} maxLength={NAME_MAX} autoComplete="name" onChange={onNameChange} />
    </SettingModal>
  );
};
