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

/** Downloads and installs an update (it is signed with the project's update key, which the app checks), then restarts. */
export const installUpdate = async (update: Update): Promise<void> => {
  await update.downloadAndInstall();
  await relaunch();
};
