import './skeleton.css';

interface SkeletonProps {
  /** Which block shape to draw: row, chips, card-small, card-large, ring, greeting or banner. */
  shape: string;
}

/** A pulsing placeholder block, shown while a page's data loads so the layout holds its shape instead of collapsing. */
export const Skeleton = (props: SkeletonProps) => {
  const { shape } = props;

  return <div aria-hidden className={`skeleton skeleton--${shape}`} />;
};
