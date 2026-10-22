import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { RegisterContent } from '@/app/(auth)/register/register-content/register-content';
import { AnimatedLogo } from '@/components/animated-logo/animated-logo';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import './register-page.css';

interface RegisterPageProps {
  searchParams: Promise<{ next?: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('auth.register');

  return { title: t('title') };
};

/** Where a first Google sign-in ends: choose a tag and a password. */
const RegisterPage = (props: RegisterPageProps) => {
  const { searchParams } = props;

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
          <RegisterContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
};

export default RegisterPage;
