'use client';

import clsx from 'clsx';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { useImportBackup } from '@/app/(app)/profile/account/use-account';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { todayIn } from '@/domain/dates';
import { parseBackup } from '@/lib/backup';
import { backupErrorText } from '@/lib/backup-error-text';
import { BACKUP_LIMITS, type BackupSummary } from '@/lib/backup-types';
import './import-card.css';

interface ImportState {
  /** A file that was read and checked, waiting for the person to confirm. */
  file: File | null;
  summary: BackupSummary | null;
  understood: boolean;
}

/** Pick a backup, see what is in it and what it replaces, and confirm. The file is checked here before anything is sent. */
export const ImportCard = () => {
  const [state, setState] = useState<ImportState>({ file: null, summary: null, understood: false });

  const t = useTranslations('account.import');
  const { data: profile } = useProfile();
  const importBackup = useImportBackup();
  const input = useRef<HTMLInputElement>(null);

  const { file, summary, understood } = state;

  const onChooseClick = () => {
    input.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const [chosen] = target.files ?? [];

    target.value = '';

    if (!chosen) {
      return;
    }

    const { name } = chosen;
    const today = todayIn(profile?.timezone ?? 'UTC');
    const result = parseBackup(await chosen.text(), name, today);

    if (!result.ok) {
      const { error } = result;

      toast.error(backupErrorText(t, error));

      return;
    }

    const { summary: found } = result;

    setState({ file: chosen, summary: found, understood: false });
  };

  const onUnderstoodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, understood: event.target.checked });
  };

  const onClose = () => {
    setState({ file: null, summary: null, understood: false });
  };

  const onConfirm = () => {
    if (file) {
      importBackup.mutate(file);
    }

    onClose();
  };

  return (
    <AccountCard title={t('title')} intro={t('intro')}>
      <p className="import-card__limits">
        {t('limits', {
          size: '5 MB',
          habits: BACKUP_LIMITS.habits.toLocaleString('en-GB'),
          ticks: BACKUP_LIMITS.ticks.toLocaleString('en-GB'),
          focusSessions: BACKUP_LIMITS.focusSessions.toLocaleString('en-GB'),
        })}
      </p>
      <button type="button" onClick={onChooseClick} className="import-card__choose">
        <Upload aria-hidden className="import-card__icon" />
        {t('choose')}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        onChange={onFileChange}
        className="sr-only"
        tabIndex={-1}
      />
      {file && summary && (
        <ConfirmModal
          title={t('modalTitle')}
          description={t('contents', { ...summary })}
          confirmLabel={t('confirm')}
          destructive
          confirmDisabled={!understood}
          onConfirm={onConfirm}
          onClose={onClose}
        >
          <p role="alert" className="import-card__warning">
            {t('warning')}
          </p>
          <label className={clsx('import-card__understand')}>
            <input type="checkbox" checked={understood} onChange={onUnderstoodChange} />
            {t('understand')}
          </label>
        </ConfirmModal>
      )}
    </AccountCard>
  );
};
