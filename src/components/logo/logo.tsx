import { useTranslations } from 'next-intl';
import { WORDMARK } from '@/components/logo/logo-shapes';
import './logo.css';

/** The full logo, "Cadence.": the ring is the C. Its height comes from `--logo-height` on the parent; its colours follow the theme. */
export const Logo = () => {
  const t = useTranslations('common');

  const { viewBox, ring, letters, stop } = WORDMARK;
  const { d: ringPath, strokeWidth } = ring;
  const { cx, cy, r } = stop;

  return (
    <svg role="img" aria-label={t('brand')} viewBox={viewBox} className="logo">
      <path d={ringPath} strokeWidth={strokeWidth} className="logo__ring" />
      {letters.map(({ char, d }, i) => {
        return <path key={`${char}-${i}`} d={d} className="logo__letter" />;
      })}
      <circle cx={cx} cy={cy} r={r} className="logo__stop" />
    </svg>
  );
};
