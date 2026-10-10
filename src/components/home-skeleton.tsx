import { Skeleton } from './skeleton';
import './home-skeleton.css';

/** The Home page's shape: header row, banner, then the two columns. */
export const HomeSkeleton = () => {
  return (
    <div role="status" aria-busy="true" aria-label="Loading home">
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
