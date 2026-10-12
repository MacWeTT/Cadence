'use client';

import { ChevronDown, Download, Globe, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hasInstallPrompt, isIosDevice, promptInstall, subscribeInstallPrompt } from '@/lib/install-prompt';
import './get-the-app.css';

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
 * "Get the app", in the profile header: the Web app (the browser's own install prompt, or on iPhone and iPad, which
 * have none, a hint to use Share) and the desktop Installer, which is not built yet. Nothing when Cadence already runs
 * as an installed app.
 */
export const GetTheApp = () => {
  const t = useTranslations('profile.app');
  const ti = useTranslations('common.install');

  const device = useSyncExternalStore(subscribeNever, readDevice, serverDevice);
  const canPrompt = useSyncExternalStore(subscribeInstallPrompt, hasInstallPrompt, serverPrompt);

  const onWebApp = () => {
    if (canPrompt) {
      void promptInstall();
    } else {
      toast.info(ti('iosHelp'), { duration: 12_000 });
    }
  };

  if (device === 'installed') {
    return null;
  }

  const webAppAvailable = canPrompt || device === 'ios';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="get-the-app__button">
          <Download aria-hidden />
          {t('button')}
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="get-the-app__menu">
        <DropdownMenuItem disabled={!webAppAvailable} onSelect={onWebApp}>
          <Globe aria-hidden />
          <span className="get-the-app__item">
            {t('webApp')}
            <span className="get-the-app__hint">{webAppAvailable ? t('webAppHint') : t('unavailable')}</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Monitor aria-hidden />
          <span className="get-the-app__item">
            {t('installer')}
            <span className="get-the-app__hint">{t('comingSoon')}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
