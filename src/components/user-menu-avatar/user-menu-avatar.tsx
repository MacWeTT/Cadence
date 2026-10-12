'use client';

import { useProfile } from '@/app/(app)/profile/use-profile';
import { Avatar } from '@/components/avatar/avatar';
import './user-menu-avatar.css';

interface UserMenuAvatarProps {
  name: string;
  /** The Google picture, shown until the profile has loaded (and if it never does). */
  googleUrl?: string;
}

/** The avatar in the account menu: the one chosen on the profile page, from the same cache as the page itself. */
export const UserMenuAvatar = (props: UserMenuAvatarProps) => {
  const { name, googleUrl } = props;

  const { data } = useProfile();

  return (
    <Avatar
      avatar={data?.avatar ?? { kind: 'google', value: null, color: null, url: googleUrl ?? null }}
      name={name}
      size="md"
      className="user-menu-avatar"
    />
  );
};
