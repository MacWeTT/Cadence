import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { RegisterContent } from '@/app/(auth)/register/register-content/register-content.desktop';
import { AnimatedLogo } from '@/components/animated-logo/animated-logo';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import './register-page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('auth.register');

  return { title: t('title') };
};

/**
 * The desktop build's register page. A static page cannot read `searchParams`, so this one does not take them; its content
 * reads `?next=` in the browser instead. `scripts/build-desktop.mjs` puts it in place of `page.tsx` while it builds.
 */
const RegisterPage = () => {
  const t = useTranslations('auth.register');

  return (
    <main className="register">
      <div className="register__theme">
        <ThemeToggle />
      </div>
      <div className="register__card">
        <h1 className="register__logo">
          <AnimatedLogo />
        </h1>
        <h2 className="register__title">{t('title')}</h2>
        <p className="register__intro">{t('intro')}</p>
        <Suspense>
          <RegisterContent />
        </Suspense>
      </div>
    </main>
  );
};

export default RegisterPage;
