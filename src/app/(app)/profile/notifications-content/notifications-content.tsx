import { Bell, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import './notifications-content.css';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';

const CHANNELS = [
  { key: 'push', Icon: Bell },
  { key: 'email', Icon: Mail },
] as const;

/** Reminders arrive in a later version: the switches are here, off and disabled, so people can see what is coming. */
export const NotificationsContent = () => {
  const t = useTranslations('profile.notifications');
  const tw = useTranslations('common.why');

  return (
    <section className="notifications-content">
      <p className="notifications-content__intro">{t('intro')}</p>
      <div className="notifications-content__card">
        {CHANNELS.map(({ key, Icon }) => {
          return (
            <div key={key} className="notifications-content__row">
              <Icon aria-hidden className="notifications-content__icon" />
              <div className="notifications-content__text">
                <span id={`notify-${key}`}>{t(key)}</span>
                <span className="notifications-content__soon">{t('comingSoon')}</span>
              </div>
              <WhyDisabled reason={tw('comingSoon')}>
                <button
                  type="button"
                  role="switch"
                  aria-checked="false"
                  aria-labelledby={`notify-${key}`}
                  disabled
                  className="notifications-content__switch"
                />
              </WhyDisabled>
            </div>
          );
        })}
      </div>
    </section>
  );
};
