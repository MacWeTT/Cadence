'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSetPassword } from '@/app/(app)/profile/account/use-password';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { passwordChangeSchema } from '@/lib/auth-schema';
import './password-modal.css';

interface PasswordModalProps {
  /** Changing a password the account has, or setting the first one. */
  hasPassword: boolean;
  onClose: () => void;
}

/** Set or change the password: a new one typed twice. No current password is asked. It closes once the server accepts it. */
export const PasswordModal = (props: PasswordModalProps) => {
  const { hasPassword, onClose } = props;

  const [form, setForm] = useState({ password: '', confirm: '' });

  const t = useTranslations('account.signIn');
  const update = useSetPassword();

  const { password, confirm } = form;
  const valid = passwordChangeSchema.safeParse(form).success;

  const onPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, password: event.target.value });
  };

  const onConfirmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, confirm: event.target.value });
  };

  const onSave = () => {
    update.mutate(form, { onSuccess: onClose });
  };

  return (
    <SettingModal
      title={hasPassword ? t('modalChange') : t('modalSet')}
      saveDisabled={!valid || update.isPending}
      onSave={onSave}
      onClose={onClose}
    >
      <div className="password-modal__field">
        <Label htmlFor="password-new">{t('newPassword')}</Label>
        <Input
          id="password-new"
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={onPasswordChange}
        />
        <p className="password-modal__hint">{t('hint')}</p>
      </div>
      <div className="password-modal__field">
        <Label htmlFor="password-confirm">{t('confirm')}</Label>
        <Input
          id="password-confirm"
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={onConfirmChange}
        />
      </div>
    </SettingModal>
  );
};
