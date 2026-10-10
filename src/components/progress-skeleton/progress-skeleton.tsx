import { Skeleton } from '../skeleton/skeleton';
import './progress-skeleton.css';

/** The Progress page's shape: filter chips, then two cards. */
export const ProgressSkeleton = () => {
  return (
    <div role="status" aria-busy="true" aria-label="Loading progress" className="progress-skeleton">
      <Skeleton shape="chips" />
      <Skeleton shape="card-small" />
      <Skeleton shape="card-large" />
    </div>
  );
};
