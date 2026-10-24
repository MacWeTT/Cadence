'use client';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { useHomeData } from '@/app/(app)/home/use-home';
import { useFocusApi } from '@/components/focus-host/focus-context';
import { trayHabits } from '@/lib/tray-habits';

/**
 * Keeps the desktop tray menu in step with the day, and answers it. The tray learns whether a session is running or which
 * habits are still open, so it can offer to start one; choosing an entry brings the window up and opens that habit's
 * focus panel (or the running session's). Desktop build only: the web app has no tray.
 */
export const TrayBridge = () => {
  const { data } = useHomeData();
  const { session, openFor, openRunning } = useFocusApi();

  const todo = data?.view.todo;
  const running = session !== null;

  useEffect(() => {
    if (!todo) {
      return;
    }

    invoke('set_tray_habits', { running, habits: trayHabits(todo) }).catch(() => {
      // the tray is a convenience: if it cannot be updated, the app still works
    });
  }, [todo, running]);

  useEffect(() => {
    const stop = listen<string>('tray-focus', ({ payload }) => {
      if (payload === 'running') {
        openRunning();

        return;
      }

      const habit = todo?.find(({ id }) => {
        return id === payload;
      });

      if (habit) {
        const { id, name, icon, color } = habit;

        openFor({ id, name, icon, color });
      }
    });

    return () => {
      void stop.then(off => {
        off();
      });
    };
  }, [todo, openFor, openRunning]);

  return null;
};
