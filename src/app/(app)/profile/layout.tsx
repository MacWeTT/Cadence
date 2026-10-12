import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageTransition } from '@/components/page-transition/page-transition';
import { ProfileHeader } from '@/app/(app)/profile/profile-header/profile-header';
import { ProfileTabs } from '@/app/(app)/profile/profile-tabs/profile-tabs';
import './layout.css';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('profile');

  return { title: t('pageTitle') };
};

const ProfileLayout = (props: ProfileLayoutProps) => {
  const { children } = props;

  return (
    <PageTransition>
      <div className="profile-layout">
        <ProfileHeader />
        <ProfileTabs />
        <div className="profile-layout__body">{children}</div>
      </div>
    </PageTransition>
  );
};

export default ProfileLayout;
