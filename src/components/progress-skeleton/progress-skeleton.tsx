import { useTranslations } from 'next-intl';
import { Skeleton } from '../skeleton/skeleton';
import './progress-skeleton.css';

/** The Progress page's shape: filter chips, then two cards. */
export const ProgressSkeleton = () => {
  const t = useTranslations('common.loading');

  return (
    <div role="status" aria-busy="true" aria-label={t('progress')} className="progress-skeleton">
      <Skeleton shape="chips" />
      <Skeleton shape="card-small" />
      <Skeleton shape="card-large" />
    </div>
  );
};
