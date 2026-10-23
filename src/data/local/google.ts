import { createAuth, type Cloud } from '@/data/local/auth';
import { t } from '@/data/local/outcome';
import { DESKTOP_RETURN_PATH, parseDesktopLink } from '@/lib/desktop-link';
import { msg, translateMsg } from '@/lib/message';

const refusal = (): string => {
  return translateMsg(t, msg('auth.signInFailed'));
};

/**
 * Google sign-in for the desktop app, through the system browser: the sign-in address opens in the browser, Google comes
 * back to the site's `/auth/desktop` page, and that page hands the one-time code to the app with a `cadence://` link.
 * The secret half of the sign-in (PKCE) never leaves the PC, so the code is useless to anyone else.
 */
export const createGoogle = (cloud: Cloud, siteUrl: string, open: (url: string) => Promise<void>) => {
  const start = async (): Promise<{ error: string | null }> => {
    const { auth } = cloud;
    const { data, error } = await auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl.replace(/\/+$/, '')}${DESKTOP_RETURN_PATH}`, skipBrowserRedirect: true },
    });

    const { url } = data;

    if (error || !url) {
      return { error: refusal() };
    }

    await open(url);

    return { error: null };
  };

  /** Finishes the sign-in from a link opened in the app: `null` for a link that is not one, else where to go on to. */
  const finish = async (link: string): Promise<{ next: string | null; error: string | null } | null> => {
    const parsed = parseDesktopLink(link);

    if (!parsed) {
      return null;
    }

    if (!('code' in parsed)) {
      return { next: null, error: refusal() };
    }

    const { auth } = cloud;
    const { error } = await auth.exchangeCodeForSession(parsed.code);

    if (error) {
      return { next: null, error: refusal() };
    }

    // A first Google sign-in ends on the register screen (a tag and a password), as on the web.
    return { next: (await createAuth(cloud).needsRegistration()) ? '/register' : '/', error: null };
  };

  return { start, finish };
};
