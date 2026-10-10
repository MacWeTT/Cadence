import { Suspense } from 'react';
import { GoogleSignInButton } from '@/components/google-sign-in-button/google-sign-in-button';
import { LoginError } from '@/components/login-error/login-error';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import './login-page.css';

const LoginPage = () => {
  return (
    <main className="login">
      <div className="login__theme">
        <ThemeToggle />
      </div>
      <div className="login__card">
        <h1 className="login__title">Cadence</h1>
        <p className="login__tagline">Build habits that stick, one day at a time.</p>
        <Suspense>
          <LoginError />
        </Suspense>
        <GoogleSignInButton />
      </div>
    </main>
  );
};

export default LoginPage;
