import { useTranslations } from 'next-intl';
import { GithubIcon } from '@/components/provider-icons/provider-icons';
import './github-sign-in-button.css';

/** GitHub sign-in is not built yet: the button is there, switched off, and says so. */
export const GithubSignInButton = () => {
  const t = useTranslations('auth');

  return (
    <div className="github-sign-in">
      <button type="button" disabled className="github-sign-in__button">
        <GithubIcon className="github-sign-in__icon" />
        {t('github')}
      </button>
      <p className="github-sign-in__soon">{t('comingSoon')}</p>
    </div>
  );
};
