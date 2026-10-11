'use client';

import { useTranslations } from 'next-intl';
import { DEFAULT_ACCENT, DEFAULT_PALETTE } from '@/lib/appearance';
import { useAppearance } from '@/lib/use-appearance';
import './appearance-preview.css';

const HEAT = [0, 1, 2, 3, 4] as const;

/** A small sample drawn with the real colours, so a choice can be judged before leaving the page. */
export const AppearancePreview = () => {
  const t = useTranslations('appearance.preview');

  const { setPalette, setAccent } = useAppearance();

  const reset = () => {
    setPalette(DEFAULT_PALETTE);
    setAccent(DEFAULT_ACCENT);
  };

  return (
    <section aria-labelledby="appearance-preview-title" className="appearance-preview">
      <h2 id="appearance-preview-title" className="appearance-preview__title">
        {t('title')}
      </h2>
      <div className="appearance-preview__row">
        <button type="button" className="appearance-preview__button">
          {t('button')}
        </button>
        <span className="appearance-preview__error">{t('error')}</span>
      </div>
      <div>
        <p className="appearance-preview__label">{t('heat')}</p>
        <div className="appearance-preview__heat">
          {HEAT.map(level => {
            return <span key={level} className={`appearance-preview__cell appearance-preview__cell--${level}`} />;
          })}
        </div>
      </div>
      <button type="button" onClick={reset} className="appearance-preview__reset">
        {t('reset')}
      </button>
    </section>
  );
};
