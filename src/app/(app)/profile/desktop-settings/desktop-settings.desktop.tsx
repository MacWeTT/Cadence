'use client';

import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import './desktop-settings.css';

/** The settings only the desktop app has: for now, whether it starts when the person signs in to Windows. */
export const DesktopSettings = () => {
  const [startOnLogin, setStartOnLogin] = useState<boolean | null>(null);

  const t = useTranslations('profile.desktop');

  useEffect(() => {
    isEnabled()
      .then(setStartOnLogin)
      .catch(() => {
        setStartOnLogin(null);
      });
  }, []);

  const onToggle = async () => {
    const next = !startOnLogin;

    try {
      await (next ? enable() : disable());
      setStartOnLogin(next);
    } catch {
      toast.error(t('failed'));
    }
  };

  if (startOnLogin === null) {
    return null;
  }

  return (
    <section className="desktop-settings">
      <h2 className="desktop-settings__title">{t('title')}</h2>
      <div className="desktop-settings__row">
        <div className="desktop-settings__text">
          <span id="start-on-login">{t('startOnLogin')}</span>
          <span className="desktop-settings__hint">{t('startOnLoginHint')}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={startOnLogin}
          aria-labelledby="start-on-login"
          onClick={onToggle}
          className={cn('desktop-settings__switch', startOnLogin && 'desktop-settings__switch--on')}
        />
      </div>
    </section>
  );
};
