/** A system notification, when the person allowed them (nothing otherwise). The desktop build swaps in the app's own. */
export const notify = (title: string, body: string): void => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
};
