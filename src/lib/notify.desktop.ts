import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

/** The desktop build's `notify`: a real Windows notification through the app, asking for permission the first time. */
export const notify = (title: string, body: string): void => {
  const send = async () => {
    const allowed = (await isPermissionGranted()) || (await requestPermission()) === 'granted';

    if (allowed) {
      sendNotification({ title, body });
    }
  };

  send().catch(() => {
    // a notification that cannot be shown is not worth an error
  });
};
