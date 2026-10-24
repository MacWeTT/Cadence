'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { Button } from '@/components/ui/button';
import { dataSource } from '@/data';
import './delete-card.css';

/** The desktop build's delete card: there is no account to name, so it empties the PC after one confirmation. */
export const DeleteCard = () => {
  const [open, setOpen] = useState(false);

  const t = useTranslations('account.delete');
  const te = useTranslations('errors');
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: async () => {
      const result = await dataSource.deleteAccount('');

      if (!result.ok) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast.success(t('deviceDone'));
      void queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error(te('generic'));
    },
  });

  const onOpen = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  const onConfirm = () => {
    remove.mutate();
    onClose();
  };

  return (
    <AccountCard title={t('deviceTitle')} intro={t('deviceIntro')} danger>
      <div className="delete-card__actions">
        <Button variant="destructive" onClick={onOpen}>
          {t('deviceButton')}
        </Button>
      </div>
      {open && (
        <ConfirmModal
          title={t('deviceModalTitle')}
          description={t('warning')}
          confirmLabel={t('confirm')}
          destructive
          onConfirm={onConfirm}
          onClose={onClose}
        />
      )}
    </AccountCard>
  );
};
