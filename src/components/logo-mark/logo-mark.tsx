import { useTranslations } from 'next-intl';
import { MARK } from '../logo/logo-shapes';
import './logo-mark.css';

/** The compact logo: the ring "C" and its dot, for places with room only for a symbol. */
export const LogoMark = () => {
  const t = useTranslations('common');

  return (
    <svg role="img" aria-label={t('brand')} viewBox="0 0 100 100" className="logo-mark">
      <path d={MARK.ring} strokeWidth={MARK.strokeWidth} className="logo-mark__ring" />
      <circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} className="logo-mark__dot" />
    </svg>
  );
};
