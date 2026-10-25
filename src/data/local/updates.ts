import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';

/** A newer version of the app on the releases page, or `null` (also when it cannot be reached: updates are never urgent). */
export const findUpdate = async (): Promise<Update | null> => {
  try {
    return await check();
  } catch {
    return null;
  }
};

/**
 * Downloads an update (it is signed with the project's update key, which the app checks), lets go of the tray and the
 * window so the installer does not meet a running app, installs it, then restarts.
 */
export const installUpdate = async (update: Update): Promise<void> => {
  await update.download();
  await invoke<void>('prepare_update');
  await update.install();
  await relaunch();
};
