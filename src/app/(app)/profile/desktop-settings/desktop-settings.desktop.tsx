'use client';

import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import type { Update } from '@tauri-apps/plugin-updater';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { findUpdate, installUpdate } from '@/data/local/updates';
import { cn } from '@/lib/utils';
import './desktop-settings.css';

interface DesktopState {
  startOnLogin: boolean | null;
  /** `idle` until asked; `found` carries the newer version. */
  update: { phase: 'idle' | 'checking' | 'upToDate' | 'found' | 'working'; found: Update | null };
}

/** The settings only the desktop app has: starting with Windows, and looking for a newer version. */
export const DesktopSettings = () => {
  const [state, setState] = useState<DesktopState>({ startOnLogin: null, update: { phase: 'idle', found: null } });

  const t = useTranslations('profile.desktop');

  const { startOnLogin, update } = state;

  useEffect(() => {
    isEnabled()
      .then(enabled => {
        setState(current => {
          return { ...current, startOnLogin: enabled };
        });
      })
      .catch(() => {
        // not running inside the app: the settings stay hidden
      });
  }, []);

  const onToggle = async () => {
    const next = !startOnLogin;

    try {
      await (next ? enable() : disable());
      setState({ ...state, startOnLogin: next });
    } catch {
      toast.error(t('failed'));
    }
  };

  const onCheck = async () => {
    setState({ ...state, update: { phase: 'checking', found: null } });

    const found = await findUpdate();

    setState({ ...state, update: found ? { phase: 'found', found } : { phase: 'upToDate', found: null } });
  };

  const onInstall = async () => {
    const { found } = update;

    if (!found) {
      return;
    }

    setState({ ...state, update: { phase: 'working', found } });

    try {
      await installUpdate(found);
    } catch {
      toast.error(t('updateFailed'));
      setState({ ...state, update });
    }
  };

  if (startOnLogin === null) {
    return null;
  }

  const { phase, found } = update;

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
      <div className="desktop-settings__row">
        <div className="desktop-settings__text">
          <span>{t('updates')}</span>
          <span className="desktop-settings__hint">
            {phase === 'upToDate' && t('upToDate')}
            {found && t('updateAvailable', { version: found.version })}
            {(phase === 'idle' || phase === 'checking' || phase === 'working') && t('updatesHint')}
          </span>
        </div>
        {found ? (
          <Button onClick={onInstall}>{t('install')}</Button>
        ) : (
          <Button variant="outline" disabled={phase === 'checking' || phase === 'working'} onClick={onCheck}>
            {phase === 'checking' ? t('checking') : t('checkUpdates')}
          </Button>
        )}
      </div>
    </section>
  );
};
