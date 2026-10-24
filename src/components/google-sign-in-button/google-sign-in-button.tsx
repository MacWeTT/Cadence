'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GoogleIcon } from '@/components/provider-icons/provider-icons';
import { NEXT_COOKIE, safeNext } from '@/lib/next-path';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import './google-sign-in-button.css';

interface SignInState {
  busy: boolean;
  error: string | null;
}

/** How long the page the person was going to is remembered: long enough for the round trip through Google. */
const NEXT_SECONDS = 600;

export const GoogleSignInButton = () => {
  const [state, setState] = useState<SignInState>({ busy: false, error: null });

  const t = useTranslations('auth');
  const params = useSearchParams();

  const signIn = async () => {
    setState({ busy: true, error: null });

    // The return from Google is a fixed address, so where the person was going travels in a short-lived cookie.
    const next = safeNext(params.get('next'));

    document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${NEXT_SECONDS}; samesite=lax`;

    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setState({ busy: false, error: error.message });
    }
  };

  const { busy, error: signInError } = state;

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        aria-label={busy ? t('redirecting') : t('continueWithGoogle')}
        className="google-sign-in"
      >
        <GoogleIcon className="google-sign-in__icon" />
        {t('google')}
      </button>
      {signInError && (
        <p role="alert" className="google-sign-in__error">
          {signInError}
        </p>
      )}
    </div>
  );
};
