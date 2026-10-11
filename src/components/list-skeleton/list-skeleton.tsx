import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/skeleton/skeleton';
import './list-skeleton.css';

interface ListSkeletonProps {
  /** Only read out for people using a screen reader; the title itself is not shown while loading. */
  title: string;
}

/** A stack of row-shaped placeholders (Today and Habits). The page, title and all, arrives in one piece. */
export const ListSkeleton = (props: ListSkeletonProps) => {
  const { title } = props;

  const t = useTranslations('common.loading');

  return (
    <div role="status" aria-busy="true" aria-label={t('list', { title })} className="list-skeleton__rows">
      {[0, 1, 2, 3].map(i => {
        return <Skeleton key={i} shape="row" />;
      })}
    </div>
  );
};
