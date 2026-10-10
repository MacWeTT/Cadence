import { useTranslations } from 'next-intl';
import { Skeleton } from '../skeleton/skeleton';
import './home-skeleton.css';

/** The Home page's shape: header row, banner, then the two columns. */
export const HomeSkeleton = () => {
  const t = useTranslations('common.loading');

  return (
    <div role="status" aria-busy="true" aria-label={t('home')}>
      <div className="home-skeleton__header">
        <Skeleton shape="ring" />
        <Skeleton shape="greeting" />
      </div>
      <Skeleton shape="banner" />
      <div className="home-skeleton__columns">
        <Skeleton shape="card-large" />
        <Skeleton shape="card-large" />
      </div>
    </div>
  );
};
