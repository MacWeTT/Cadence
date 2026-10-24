/** The address the desktop app registers on the PC (`tauri.conf.json`), and the page on the site that hands over to it. */
export const DESKTOP_SCHEME = 'cadence:';
export const DESKTOP_RETURN_PATH = '/auth/desktop';

/** What a link back to the app carries: the one-time code of a sign-in, or that it did not work. */
export type DesktopLink = { code: string } | { error: string };

const CODE = /^[A-Za-z0-9._-]{1,200}$/;

/** The link the site's hand-over page opens: only a well-formed code goes in, anything else is a plain refusal. */
export const buildDesktopLink = ({ code, error }: { code?: string | null; error?: string | null }): string => {
  if (code && CODE.test(code)) {
    return `${DESKTOP_SCHEME}//auth?code=${code}`;
  }

  return `${DESKTOP_SCHEME}//auth?error=${error && CODE.test(error) ? error : 'auth'}`;
};

/** What a link opened in the app carries, or `null` for any link that is not a sign-in coming back. */
export const parseDesktopLink = (link: string): DesktopLink | null => {
  try {
    const { protocol, hostname, searchParams } = new URL(link);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (protocol !== DESKTOP_SCHEME || hostname !== 'auth') {
      return null;
    }

    if (code && CODE.test(code)) {
      return { code };
    }

    return error ? { error } : null;
  } catch {
    return null;
  }
};
