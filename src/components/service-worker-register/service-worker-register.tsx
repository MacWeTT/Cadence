'use client';

import { useEffect } from 'react';
import { captureInstallPrompt, clearInstallPrompt, type InstallPromptEvent } from '@/lib/install-prompt';

/**
 * Registers the service worker (public/sw.js, which gives the installed app an offline page) and keeps the browser's
 * install prompt for the menu. The worker is left out in development, where it would hold on to stale files.
 */
export const ServiceWorkerRegister = () => {
  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault(); // the menu offers the prompt instead of the browser's own banner
      captureInstallPrompt(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      clearInstallPrompt();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
};
