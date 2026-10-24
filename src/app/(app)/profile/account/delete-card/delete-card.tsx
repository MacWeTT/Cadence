'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { useDeleteAccount } from '@/app/(app)/profile/account/use-account';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import './delete-card.css';

interface DeleteState {
  open: boolean;
  typed: string;
}

/** The one thing that cannot be undone: the account and everything in it, after typing the account's email address. */
export const DeleteCard = () => {
  const [state, setState] = useState<DeleteState>({ open: false, typed: '' });

  const t = useTranslations('account.delete');
  const { data } = useProfile();
  const remove = useDeleteAccount();

  const { open, typed } = state;
  const email = data?.email ?? '';
  const matches = email !== '' && typed.trim().toLowerCase() === email.toLowerCase();

  const onOpen = () => {
    setState({ open: true, typed: '' });
  };

  const onClose = () => {
    setState({ open: false, typed: '' });
  };

  const onTypedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, typed: event.target.value });
  };

  const onConfirm = () => {
    remove.mutate(typed);
    onClose();
  };

  return (
    <AccountCard title={t('title')} intro={t('intro')} danger>
      <div className="delete-card__actions">
        <Button variant="destructive" onClick={onOpen}>
          {t('button')}
        </Button>
      </div>
      {open && (
        <ConfirmModal
          title={t('modalTitle')}
          description={t('warning')}
          confirmLabel={t('confirm')}
          destructive
          confirmDisabled={!matches}
          confirmDisabledReason={t('type')}
          onConfirm={onConfirm}
          onClose={onClose}
        >
          <Label htmlFor="delete-email">{t('type')}</Label>
          <Input
            id="delete-email"
            type="email"
            value={typed}
            placeholder={email || t('placeholder')}
            autoComplete="off"
            onChange={onTypedChange}
          />
        </ConfirmModal>
      )}
    </AccountCard>
  );
};
