'use client';

import { useEffect } from 'react';

/**
 * The desktop build's stand-in for the web app's service worker registration. The desktop app is not installed from a
 * browser and its pages come from the app itself, which a service worker cannot reach, so it must never run one. This only
 * removes one an earlier run left behind.
 */
export const ServiceWorkerRegister = () => {
  useEffect(() => {
    void navigator.serviceWorker?.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        void registration.unregister();
      });
    });
  }, []);

  return null;
};
