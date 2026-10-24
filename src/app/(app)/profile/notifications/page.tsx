import { DesktopSettings } from '@/app/(app)/profile/desktop-settings/desktop-settings';
import { NotificationsContent } from '@/app/(app)/profile/notifications-content/notifications-content';

const NotificationsPage = () => {
  return (
    <>
      <NotificationsContent />
      <DesktopSettings />
    </>
  );
};

export default NotificationsPage;
