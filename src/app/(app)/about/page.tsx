import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { AboutIllustration } from '@/components/about-illustration/about-illustration';
import { DEVELOPER } from '@/lib/site';
import './page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('about');

  return { title: t('pageTitle') };
};

const FEATURES = ['daily', 'streaks', 'home', 'progress', 'theme', 'private'] as const;

const AboutPage = () => {
  const t = useTranslations('about');

  return (
    <article className="about">
      <div className="about__body">
        <h1 className="about__title">{t('title')}</h1>
        <p className="about__text">{t('intro')}</p>
        <h2 className="about__subtitle">{t('howTitle')}</h2>
        <p className="about__text">{t('how')}</p>
        <h2 className="about__subtitle">{t('featuresTitle')}</h2>
        <ul className="about__features">
          {FEATURES.map(key => {
            return (
              <li key={key} className="about__feature">
                <h3 className="about__feature-title">{t(`features.${key}.title`)}</h3>
                <p className="about__feature-text">{t(`features.${key}.text`)}</p>
              </li>
            );
          })}
        </ul>
        <p className="about__text">
          {t('builtBy')}{' '}
          <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="about__link">
            {DEVELOPER.name}
          </a>
          {'.'}
        </p>
      </div>
      <AboutIllustration />
    </article>
  );
};

export default AboutPage;
