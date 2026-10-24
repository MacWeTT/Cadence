import { useTranslations } from 'next-intl';
import Link from 'next/link';
import './legal-note.css';

/** "By continuing you agree to the Terms and the Privacy policy": under the sign-in options. */
export const LegalNote = () => {
  const t = useTranslations('legal');

  return (
    <p className="legal-note">
      {t.rich('note', {
        terms: chunks => {
          return (
            <Link href="/terms" className="legal-note__link">
              {chunks}
            </Link>
          );
        },
        privacy: chunks => {
          return (
            <Link href="/privacy" className="legal-note__link">
              {chunks}
            </Link>
          );
        },
      })}
    </p>
  );
};
