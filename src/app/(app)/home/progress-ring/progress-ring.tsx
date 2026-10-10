import { useTranslations } from 'next-intl';
import './progress-ring.css';

interface ProgressRingProps {
  done: number;
  total: number;
}

/** A ring that fills as the day's habits get done, with "done/total" in the middle. */
export const ProgressRing = (props: ProgressRingProps) => {
  const { done, total } = props;

  const t = useTranslations('home');

  return (
    <div
      role="img"
      aria-label={t('ringLabel', { done, total })}
      className="progress-ring"
      style={{ background: `conic-gradient(var(--primary) ${total ? (done / total) * 360 : 0}deg, var(--line) 0)` }}
    >
      <span aria-hidden className="progress-ring__label">
        {done}
        {'/'}
        {total}
      </span>
    </div>
  );
};
