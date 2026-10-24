'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { findUpdate, installUpdate } from '@/data/local/updates';

/** Tells the person, once at start, when a newer version of the desktop app is out, with a button to install it. */
export const UpdateNotifier = () => {
  const t = useTranslations('profile.desktop');

  useEffect(() => {
    void findUpdate().then(update => {
      if (!update) {
        return;
      }

      const onInstall = () => {
        installUpdate(update).catch(() => {
          toast.error(t('updateFailed'));
        });
      };

      toast(t('updateAvailable', { version: update.version }), {
        duration: Infinity,
        action: { label: t('install'), onClick: onInstall },
      });
    });
  }, [t]);

  return null;
};
