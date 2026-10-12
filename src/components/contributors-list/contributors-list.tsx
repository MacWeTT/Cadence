import { useTranslations } from 'next-intl';
import { CONTRIBUTORS } from '@/lib/contributors';
import './contributors-list.css';

/** Everyone who has helped build Cadence: the primary contributor first, then the rest. */
export const ContributorsList = () => {
  const t = useTranslations('about.contributors');

  const [{ name: primaryName, url: primaryUrl }, ...others] = CONTRIBUTORS;

  return (
    <div id="contributors" className="contributors-list">
      <p>
        <span className="contributors-list__label">{t('primary')}</span>{' '}
        <a href={primaryUrl} target="_blank" rel="noreferrer" className="contributors-list__link">
          {primaryName}
        </a>
      </p>
      {others.length > 0 && (
        <p>
          <span className="contributors-list__label">{t('others')}</span>{' '}
          {others.map(({ name, url }, index) => {
            return (
              <span key={url}>
                {index > 0 && ', '}
                <a href={url} target="_blank" rel="noreferrer" className="contributors-list__link">
                  {name}
                </a>
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
};
