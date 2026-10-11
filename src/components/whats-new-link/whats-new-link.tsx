'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { NavLink } from '@/components/nav-link/nav-link';
import './whats-new-link.css';

const KEY = 'cadence:seen-version';
const SEEN = 'cadence:seen-version-changed';

const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener(SEEN, notify);

  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(SEEN, notify);
  };
};

const isUnseen = (version: string) => {
  try {
    return window.localStorage.getItem(KEY) !== version;
  } catch {
    return false; // storage is blocked: no dot, rather than one that never goes away
  }
};

const noDotOnServer = () => {
  return false;
};

interface WhatsNewLinkProps {
  /** The current release: its notes count as seen once the changelog page has been opened. */
  version: string;
}

/** The footer link to the changelog. A small dot says there is a version whose notes have not been opened yet. */
export const WhatsNewLink = (props: WhatsNewLinkProps) => {
  const { version } = props;

  const t = useTranslations('footer');
  const unseen = useSyncExternalStore(
    subscribe,
    () => {
      return isUnseen(version);
    },
    noDotOnServer,
  );
  const onChangelog = usePathname() === '/changelog';

  // Opening the page counts as having read this version's notes.
  useEffect(() => {
    if (!onChangelog) {
      return;
    }

    try {
      window.localStorage.setItem(KEY, version);
      window.dispatchEvent(new Event(SEEN));
    } catch {
      // nothing to remember it in
    }
  }, [onChangelog, version]);

  return (
    <NavLink href="/changelog" group="footer-nav">
      {t('whatsNew')}
      {unseen && !onChangelog && <span aria-hidden className="whats-new-link__dot" />}
    </NavLink>
  );
};
