import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/skeleton/skeleton';
import './profile-skeleton.css';

/** The profile's shape while it loads for the first time: one card of rows. */
export const ProfileSkeleton = () => {
  const t = useTranslations('common.loading');

  return (
    <div role="status" aria-busy="true" aria-label={t('profile')} className="profile-skeleton">
      {[0, 1, 2, 3, 4].map(i => {
        return <Skeleton key={i} shape="row" />;
      })}
    </div>
  );
};
