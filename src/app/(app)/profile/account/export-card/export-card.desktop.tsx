'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { useAccountCounts } from '@/app/(app)/profile/account/use-account';
import { local } from '@/data/local';
import { BACKUP_LIMITS } from '@/lib/backup-types';
import './export-card.css';

const FORMATS = ['json', 'csv', 'pdf'] as const;

/**
 * The desktop build's export card: the same card, but the files are made on the PC from its own file instead of by the
 * server, the PDF report included.
 */
export const ExportCard = () => {
  const t = useTranslations('account.export');

  const { data } = useAccountCounts();

  const { habits = 0, ticks = 0, focusSessions = 0 } = data ?? {};
  const over =
    habits > BACKUP_LIMITS.habits || ticks > BACKUP_LIMITS.ticks || focusSessions > BACKUP_LIMITS.focusSessions;

  const onDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const { format: wanted } = event.currentTarget.dataset;
    const format = wanted === 'csv' || wanted === 'pdf' ? wanted : 'json';

    try {
      const { fileName, type, data } = await local.exportFile(format);
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('failed'));
    }
  };

  return (
    <AccountCard title={t('title')} intro={t('intro')}>
      {data && <p className="export-card__counts">{t('counts', { ...data })}</p>}
      {over && (
        <p role="note" className="export-card__over">
          {t('overLimit', {
            habits: BACKUP_LIMITS.habits.toLocaleString('en-GB'),
            ticks: BACKUP_LIMITS.ticks.toLocaleString('en-GB'),
            focusSessions: BACKUP_LIMITS.focusSessions.toLocaleString('en-GB'),
          })}
        </p>
      )}
      <div className="export-card__formats">
        {FORMATS.map(format => {
          return (
            <button
              key={format}
              type="button"
              data-format={format}
              className="export-card__format"
              onClick={onDownload}
            >
              <Download aria-hidden className="export-card__icon" />
              <span>
                <span className="export-card__name">{t('download', { format: t(format) })}</span>
                <span className="export-card__hint">{t(`${format}Hint`)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </AccountCard>
  );
};
