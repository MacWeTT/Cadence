import { useTranslations } from 'next-intl';
import { CONTRIBUTORS, githubUrl } from '@/lib/contributors';
import './contributors-list.css';

/** Everyone who has helped build Cadence, by GitHub username: the primary contributor first, then the rest, comma-separated. */
export const ContributorsList = () => {
  const t = useTranslations('about.contributors');

  const [primary, ...others] = CONTRIBUTORS;

  return (
    <div id="contributors" className="contributors-list">
      <p>
        <span className="contributors-list__label">{t('primary')}</span>{' '}
        <a href={githubUrl(primary)} target="_blank" rel="noreferrer" className="contributors-list__link">
          {primary}
        </a>
      </p>
      {others.length > 0 && (
        <p>
          <span className="contributors-list__label">{t('others')}</span>{' '}
          {others.map((username, index) => {
            return (
              <span key={username}>
                {index > 0 && ', '}
                <a href={githubUrl(username)} target="_blank" rel="noreferrer" className="contributors-list__link">
                  {username}
                </a>
              </span>
            );
          })}
        </p>
      )}
    </div>
  );
};
