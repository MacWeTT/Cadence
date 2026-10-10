import { useTranslations } from 'next-intl';
import { WORDMARK } from './logo-shapes';
import './logo.css';

/** The full logo, "Cadence." Its height comes from `--logo-height` on the parent; its colours follow the theme. */
export const Logo = () => {
  const t = useTranslations('common');

  return (
    <svg role="img" aria-label={t('brand')} viewBox={WORDMARK.viewBox} className="logo">
      {WORDMARK.letters.map(({ char, d }, i) => {
        return <path key={`${char}-${i}`} d={d} className={i === 0 ? 'logo__c' : 'logo__letter'} />;
      })}
      <circle cx={WORDMARK.stop.cx} cy={WORDMARK.stop.cy} r={WORDMARK.stop.r} className="logo__stop" />
    </svg>
  );
};
