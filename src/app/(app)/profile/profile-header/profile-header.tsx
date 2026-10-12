'use client';

import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/avatar/avatar';
import { GetTheApp } from '@/components/get-the-app/get-the-app';
import { useProfile } from '@/app/(app)/profile/use-profile';
import './profile-header.css';

/** Who you are, at the top of every profile tab: your avatar, name and email. */
export const ProfileHeader = () => {
  const t = useTranslations('profile');

  const { data } = useProfile();

  if (!data) {
    return (
      <header aria-hidden className="profile-header">
        <span className="profile-header__avatar-skeleton" />
        <span className="profile-header__text-skeleton" />
      </header>
    );
  }

  const { avatar, name, email } = data;
  const shownName = name || email || t('header.fallbackName');

  return (
    <header className="profile-header">
      <Avatar avatar={avatar} name={shownName} size="lg" className="profile-header__avatar" />
      <div className="profile-header__who">
        <h1 className="profile-header__name">{shownName}</h1>
        <p className="profile-header__email">{email}</p>
      </div>
      <GetTheApp />
    </header>
  );
};
