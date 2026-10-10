import { useTranslations } from 'next-intl';
import { Skeleton } from '../skeleton/skeleton';
import './list-skeleton.css';

interface ListSkeletonProps {
  title: string;
}

/** A page title with a stack of row-shaped placeholders under it (Today and Habits). */
export const ListSkeleton = (props: ListSkeletonProps) => {
  const { title } = props;

  const t = useTranslations('common.loading');

  return (
    <div role="status" aria-busy="true" aria-label={t('list', { title })}>
      <h1 className="list-skeleton__title">{title}</h1>
      <div className="list-skeleton__rows">
        {[0, 1, 2, 3].map(i => {
          return <Skeleton key={i} shape="row" />;
        })}
      </div>
    </div>
  );
};
