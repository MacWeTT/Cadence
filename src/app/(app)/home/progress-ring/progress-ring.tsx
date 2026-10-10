import './progress-ring.css';

interface ProgressRingProps {
  done: number;
  total: number;
}

/** A ring that fills as the day's habits get done, with "done/total" in the middle. */
export const ProgressRing = (props: ProgressRingProps) => {
  const { done, total } = props;

  return (
    <div
      role="img"
      aria-label={`${done} of ${total} done today`}
      className="progress-ring"
      style={{ background: `conic-gradient(var(--primary) ${total ? (done / total) * 360 : 0}deg, var(--line) 0)` }}
    >
      <span aria-hidden className="progress-ring__label">
        {done}/{total}
      </span>
    </div>
  );
};
