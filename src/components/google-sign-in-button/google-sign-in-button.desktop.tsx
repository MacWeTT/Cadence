'use client';

import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { GoogleIcon } from '@/components/provider-icons/provider-icons';
import { local } from '@/data/local';
import './google-sign-in-button.css';

interface SignInState {
  busy: boolean;
  error: string | null;
}

/**
 * The desktop build's Google button: it opens Google in the system browser and waits for the `cadence://` link the site's
 * hand-over page opens, which brings the one-time code back to this window.
 */
export const GoogleSignInButton = () => {
  const [state, setState] = useState<SignInState>({ busy: false, error: null });

  const t = useTranslations('auth');

  const { busy, error: signInError } = state;

  useEffect(() => {
    const finish = async (links: string[]) => {
      for (const link of links) {
        const { next, error } = (await local.finishGoogle(link)) ?? { next: null, error: null };

        if (next) {
          window.location.assign(next);
        } else if (error) {
          setState({ busy: false, error });
        }
      }
    };

    // a link that started the app, and links that arrive while it runs
    void getCurrent().then(links => {
      return finish(links ?? []);
    });

    const stop = onOpenUrl(finish);

    return () => {
      void stop.then(off => {
        off();
      });
    };
  }, []);

  const onSignIn = async () => {
    setState({ busy: true, error: null });

    const { error } = await local.startGoogle();

    if (error) {
      setState({ busy: false, error });
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onSignIn}
        disabled={busy}
        aria-label={busy ? t('redirecting') : t('continueWithGoogle')}
        className="google-sign-in"
      >
        <GoogleIcon className="google-sign-in__icon" />
        {t('google')}
      </button>
      {busy && <p className="google-sign-in__error">{t('waitingForBrowser')}</p>}
      {signInError && (
        <p role="alert" className="google-sign-in__error">
          {signInError}
        </p>
      )}
    </div>
  );
};
