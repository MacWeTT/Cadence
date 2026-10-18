'use client';

import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { signOut } from '@/app/auth/actions';
import { AvatarModal } from '@/app/(app)/profile/avatar-modal/avatar-modal';
import { NameModal } from '@/app/(app)/profile/name-modal/name-modal';
import { TagModal } from '@/app/(app)/profile/tag-modal/tag-modal';
import { SoundModal } from '@/app/(app)/profile/sound-modal/sound-modal';
import { TimezoneModal } from '@/app/(app)/profile/timezone-modal/timezone-modal';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { WeekStartModal } from '@/app/(app)/profile/week-start-modal/week-start-modal';
import { Avatar } from '@/components/avatar/avatar';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ProfileSkeleton } from '@/components/profile-skeleton/profile-skeleton';
import { SettingRow } from '@/components/setting-row/setting-row';
import { Button } from '@/components/ui/button';
import { isChimeId } from '@/lib/chimes';
import { zoneLabel } from '@/lib/zones';
import './overview-content.css';

type Setting = 'photo' | 'name' | 'tag' | 'timezone' | 'weekStart' | 'sound';

interface OverviewState {
  /** The modal that is open, if any. */
  open: Setting | null;
}

/** The profile's first tab: one list of settings, each opening its own small modal. */
export const OverviewContent = () => {
  const [state, setState] = useState<OverviewState>({ open: null });

  const t = useTranslations('profile');
  const ta = useTranslations('common.account');
  const { data, isError, refetch } = useProfile();

  const { open } = state;

  const onClose = () => {
    setState({ open: null });
  };

  const onRetry = () => {
    void refetch();
  };

  const onPhotoOpen = () => {
    setState({ open: 'photo' });
  };

  const onNameOpen = () => {
    setState({ open: 'name' });
  };

  const onTagOpen = () => {
    setState({ open: 'tag' });
  };

  const onTimezoneOpen = () => {
    setState({ open: 'timezone' });
  };

  const onWeekStartOpen = () => {
    setState({ open: 'weekStart' });
  };

  const onSoundOpen = () => {
    setState({ open: 'sound' });
  };

  if (!data) {
    return isError ? (
      <EmptyState
        title={t('loadFailedTitle')}
        text={t('loadFailedText')}
        action={<Button onClick={onRetry}>{t('retry')}</Button>}
      />
    ) : (
      <ProfileSkeleton />
    );
  }

  const { name, tag, email, avatar, timezone, weekStartsOn, sound, customSounds } = data;
  const shownName = name || email || t('header.fallbackName');
  const { city, region } = zoneLabel(timezone);
  const { id: soundId } = sound;
  const soundName = isChimeId(soundId)
    ? t(`sound.names.${soundId}`)
    : (customSounds.find(({ id }) => {
        return id === soundId;
      })?.name ?? t('sound.names.bell'));

  return (
    <section className="overview-content">
      <div className="overview-content__card">
        <SettingRow label={t('rows.photo')} onOpen={onPhotoOpen}>
          <Avatar avatar={avatar} name={shownName} size="sm" />
          {t('rows.change')}
        </SettingRow>
        <SettingRow label={t('rows.name')} onOpen={onNameOpen}>
          {name}
        </SettingRow>
        <SettingRow label={t('rows.tag')} onOpen={onTagOpen}>
          {t('tag.display', { tag })}
        </SettingRow>
        <SettingRow label={t('rows.timezone')} onOpen={onTimezoneOpen}>
          {region ? `${city} · ${region}` : city}
        </SettingRow>
        <SettingRow label={t('rows.weekStart')} onOpen={onWeekStartOpen}>
          {t(`weekdays.${weekStartsOn === 7 ? 'sunday' : 'monday'}`)}
        </SettingRow>
        <SettingRow label={t('rows.sound')} onOpen={onSoundOpen}>
          {soundName}
        </SettingRow>
      </div>

      <form action={signOut} className="overview-content__sign-out">
        <Button type="submit" variant="destructive">
          <LogOut aria-hidden />
          {ta('signOut')}
        </Button>
      </form>

      {open === 'photo' && <AvatarModal avatar={avatar} name={shownName} onClose={onClose} />}
      {open === 'name' && <NameModal name={name} onClose={onClose} />}
      {open === 'tag' && <TagModal tag={tag} onClose={onClose} />}
      {open === 'timezone' && <TimezoneModal timezone={timezone} onClose={onClose} />}
      {open === 'weekStart' && <WeekStartModal weekStartsOn={weekStartsOn} onClose={onClose} />}
      {open === 'sound' && <SoundModal sound={sound} customSounds={customSounds} onClose={onClose} />}
    </section>
  );
};
