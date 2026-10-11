import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { AboutIllustration } from '@/components/about-illustration/about-illustration';
import { Arrive } from '@/components/arrive/arrive';
import { PageTransition } from '@/components/page-transition/page-transition';
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
    <PageTransition>
      <article className="about">
        <div className="about__body">
          <Arrive index={0}>
            <h1 className="about__title">{t('title')}</h1>
            <p className="about__text">{t('intro')}</p>
          </Arrive>
          <Arrive index={1}>
            <h2 className="about__subtitle">{t('howTitle')}</h2>
            <p className="about__text">{t('how')}</p>
          </Arrive>
          <Arrive index={2}>
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
          </Arrive>
          <Arrive index={3}>
            <p className="about__text">
              {t('builtBy')}{' '}
              <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="about__link">
                {DEVELOPER.name}
              </a>
              {'.'}
            </p>
          </Arrive>
        </div>
        <AboutIllustration />
      </article>
    </PageTransition>
  );
};

export default AboutPage;
