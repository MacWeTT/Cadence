import { useTranslations } from 'next-intl';
import { WORDMARK } from './logo-shapes';
import './logo.css';

/** The full logo, "Cadence.": the ring is the C. Its height comes from `--logo-height` on the parent; its colours follow the theme. */
export const Logo = () => {
  const t = useTranslations('common');

  const { viewBox, ring, letters, stop } = WORDMARK;

  return (
    <svg role="img" aria-label={t('brand')} viewBox={viewBox} className="logo">
      <path d={ring.d} strokeWidth={ring.strokeWidth} className="logo__ring" />
      {letters.map(({ char, d }, i) => {
        return <path key={`${char}-${i}`} d={d} className="logo__letter" />;
      })}
      <circle cx={stop.cx} cy={stop.cy} r={stop.r} className="logo__stop" />
    </svg>
  );
};
