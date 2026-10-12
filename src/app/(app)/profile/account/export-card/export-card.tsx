'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { useAccountCounts } from '@/app/(app)/profile/account/use-account';
import { BACKUP_LIMITS } from '@/lib/backup-types';
import './export-card.css';

const FORMATS = ['json', 'csv', 'pdf'] as const;

/** Three downloads of the same data. A warning when there is more than an import would take back. */
export const ExportCard = () => {
  const t = useTranslations('account.export');

  const { data } = useAccountCounts();

  const { habits = 0, ticks = 0, focusSessions = 0 } = data ?? {};
  const over =
    habits > BACKUP_LIMITS.habits || ticks > BACKUP_LIMITS.ticks || focusSessions > BACKUP_LIMITS.focusSessions;

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
            <a key={format} href={`/api/export?format=${format}`} className="export-card__format">
              <Download aria-hidden className="export-card__icon" />
              <span>
                <span className="export-card__name">{t('download', { format: t(format) })}</span>
                <span className="export-card__hint">{t(`${format}Hint`)}</span>
              </span>
            </a>
          );
        })}
      </div>
    </AccountCard>
  );
};
