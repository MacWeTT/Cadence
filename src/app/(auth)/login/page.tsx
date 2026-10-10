import { Suspense } from 'react';
import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { LoginError } from '@/components/login-error';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <h1 className="font-display text-4xl">Cadence</h1>
        <p className="mb-8 mt-2 text-ink-muted">Build habits that stick, one day at a time.</p>
        <Suspense>
          <LoginError />
        </Suspense>
        <GoogleSignInButton />
      </div>
    </main>
  );
}
