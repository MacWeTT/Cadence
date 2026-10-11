import { useTranslations } from 'next-intl';
import { DEVELOPER, VERSION } from '@/lib/site';
import { NavLink } from '@/components/nav-link/nav-link';
import { WhatsNewLink } from '@/components/whats-new-link/whats-new-link';
import './footer.css';

/** The foot of every app page: where to read about Cadence, how to get in touch, and who builds it. */
export const Footer = () => {
  const t = useTranslations('footer');

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__about">
          <p>
            {t('developedBy')}{' '}
            <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="footer__link">
              {DEVELOPER.name}
            </a>
          </p>
          <p className="footer__version">{t('version', { version: VERSION })}</p>
        </div>
        <nav className="footer__nav">
          <WhatsNewLink />
          <NavLink href="/about" group="footer-nav">
            {t('about')}
          </NavLink>
          <NavLink href="/contact" group="footer-nav">
            {t('contact')}
          </NavLink>
        </nav>
      </div>
    </footer>
  );
};
