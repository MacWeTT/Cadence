'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { hasInstallPrompt, isIosDevice, promptInstall, subscribeInstallPrompt } from '@/lib/install-prompt';

type Device = 'installed' | 'ios' | 'other';

const subscribeNever = () => {
  return () => {};
};

const readDevice = (): Device => {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) {
    return 'installed';
  }

  return isIosDevice(navigator.userAgent) ? 'ios' : 'other';
};

const serverDevice = (): Device => {
  return 'other';
};

const serverPrompt = () => {
  return false;
};

/**
 * "Install app" in the account menu: the browser's own prompt where there is one, and on iPhone and iPad (which have
 * none) a hint to use Share. Nothing when Cadence is already running as an installed app.
 */
export const InstallMenuItem = () => {
  const t = useTranslations('common.install');
  const device = useSyncExternalStore(subscribeNever, readDevice, serverDevice);
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, hasInstallPrompt, serverPrompt);

  const onInstall = () => {
    void promptInstall();
  };

  const onIosHelp = () => {
    toast.info(t('iosHelp'), { duration: 12_000 });
  };

  if (device === 'installed') {
    return null;
  }

  if (canPrompt) {
    return <DropdownMenuItem onSelect={onInstall}>{t('app')}</DropdownMenuItem>;
  }

  return device === 'ios' ? <DropdownMenuItem onSelect={onIosHelp}>{t('ios')}</DropdownMenuItem> : null;
};
