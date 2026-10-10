import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEVELOPER } from '@/lib/site';
import './footer.css';

/** The foot of every app page: where to read about Cadence, how to get in touch, and who builds it. */
export const Footer = () => {
  const t = useTranslations('footer');

  return (
    <footer className="footer">
      <div className="footer__inner">
        <p className="footer__credit">
          {t('developedBy')}{' '}
          <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="footer__link">
            {DEVELOPER.name}
          </a>
        </p>
        <nav className="footer__nav">
          <Link href="/about" className="footer__link">
            {t('about')}
          </Link>
          <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="footer__link">
            {t('contact')}
          </a>
        </nav>
      </div>
    </footer>
  );
};
