'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import './google-sign-in-button.css';

interface SignInState {
  busy: boolean;
  error: string | null;
}

export const GoogleSignInButton = () => {
  const [state, setState] = useState<SignInState>({ busy: false, error: null });

  const t = useTranslations('auth');

  const signIn = async () => {
    setState({ busy: true, error: null });

    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setState({ busy: false, error: error.message });
    }
  };

  return (
    <div>
      <button type="button" onClick={signIn} disabled={state.busy} className="google-sign-in">
        {state.busy ? t('redirecting') : t('continueWithGoogle')}
      </button>
      {state.error && (
        <p role="alert" className="google-sign-in__error">
          {state.error}
        </p>
      )}
    </div>
  );
};
