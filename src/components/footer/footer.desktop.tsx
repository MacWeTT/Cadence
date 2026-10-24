import { useTranslations } from 'next-intl';
import { Logo } from '@/components/logo/logo';
import { NavLink } from '@/components/nav-link/nav-link';
import { WhatsNewLink } from '@/components/whats-new-link/whats-new-link';
import { DEVELOPER, VERSION } from '@/lib/site';
import './footer.css';

/**
 * The desktop build's footer: the same, without the Contact page (it sends mail from a server). The foot of every app page: where to read about Cadence, how to get in touch, and who builds it. A bar like the top
 * bar on larger screens; a card with the tagline on phones.
 */
export const Footer = () => {
  const t = useTranslations('footer');
  const tc = useTranslations('common');

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo />
          <p className="footer__tagline">{tc('tagline')}</p>
        </div>
        <nav className="footer__nav">
          <WhatsNewLink version={VERSION} />
          <NavLink href="/about" group="footer-nav">
            {t('about')}
          </NavLink>
          <NavLink href="/privacy" group="footer-nav">
            {t('privacy')}
          </NavLink>
          <NavLink href="/terms" group="footer-nav">
            {t('terms')}
          </NavLink>
        </nav>
        <div className="footer__legal">
          <p>
            {t('developedBy')}{' '}
            <a href={DEVELOPER.url} target="_blank" rel="noreferrer" className="footer__link">
              {DEVELOPER.name}
            </a>
          </p>
          <p className="footer__version">{t('version', { version: VERSION })}</p>
        </div>
      </div>
    </footer>
  );
};
