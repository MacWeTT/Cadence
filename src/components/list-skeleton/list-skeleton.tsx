import { Skeleton } from '../skeleton/skeleton';
import './list-skeleton.css';

interface ListSkeletonProps {
  title: string;
}

/** A page title with a stack of row-shaped placeholders under it (Today and Habits). */
export const ListSkeleton = (props: ListSkeletonProps) => {
  const { title } = props;

  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
      <h1 className="list-skeleton__title">{title}</h1>
      <div className="list-skeleton__rows">
        {[0, 1, 2, 3].map(i => {
          return <Skeleton key={i} shape="row" />;
        })}
      </div>
    </div>
  );
};
