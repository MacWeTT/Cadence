import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import './layout.css';

interface LegalLayoutProps {
  children: React.ReactNode;
}

/**
 * The frame of the public documents (privacy, terms). They open without an account, so it has none of the app's bars:
 * a way back, the theme, and the other document in the foot.
 */
const LegalLayout = (props: LegalLayoutProps) => {
  const { children } = props;

  const t = useTranslations('legal');

  return (
    <div className="legal-layout">
      <header className="legal-layout__header">
        <Link href="/" className="legal-layout__back">
          {t('backToCadence')}
        </Link>
        <ThemeToggle />
      </header>
      <main className="legal-layout__main">{children}</main>
      <footer className="legal-layout__footer">
        <Link href="/privacy" className="legal-layout__link">
          {t('privacy')}
        </Link>
        <Link href="/terms" className="legal-layout__link">
          {t('terms')}
        </Link>
      </footer>
    </div>
  );
};

export default LegalLayout;
