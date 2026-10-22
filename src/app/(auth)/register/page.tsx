import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/app/(auth)/register/register-form/register-form';
import { AnimatedLogo } from '@/components/animated-logo/animated-logo';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import { safeNext } from '@/lib/next-path';
import { getRegistration } from '@/server/registration';
import './register-page.css';

interface RegisterPageProps {
  searchParams: Promise<{ next?: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('auth.register');

  return { title: t('title') };
};

/** Where a first Google sign-in ends: choose a tag and a password. An account that has done it goes straight on. */
const RegisterPage = async (props: RegisterPageProps) => {
  const { searchParams } = props;

  const [{ next }, { email, tag, registered }, t] = await Promise.all([
    searchParams,
    getRegistration(),
    getTranslations('auth.register'),
  ]);

  if (registered) {
    redirect(safeNext(next));
  }

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
        <RegisterForm email={email} tag={tag} next={next ?? null} />
      </div>
    </main>
  );
};

export default RegisterPage;
