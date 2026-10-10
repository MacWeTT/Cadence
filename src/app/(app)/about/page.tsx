import { useTranslations } from 'next-intl';
import { DEVELOPER } from '@/lib/site';
import './page.css';

const AboutPage = () => {
  const t = useTranslations('about');

  return (
    <article className="about">
      <h1 className="about__title">{t('title')}</h1>
      <p className="about__text">{t('intro')}</p>
      <h2 className="about__subtitle">{t('howTitle')}</h2>
      <p className="about__text">{t('how')}</p>
      <p className="about__text">
        {t('builtBy')}{' '}
        <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="about__link">
          {DEVELOPER.name}
        </a>
        {'.'}
      </p>
    </article>
  );
};

export default AboutPage;
