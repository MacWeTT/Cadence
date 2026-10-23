import type { AvatarView } from '@/server/profile-view';
import type { AvatarView as FriendAvatar } from '@/server/circles-view';

/** The name a person goes by in a circle: the name they gave, or their @tag when they gave none. */
export const memberName = (displayName: string | null, tag: string): string => {
  const name = displayName?.trim();

  return name ? name : `@${tag}`;
};

/** What an avatar takes its initial from: the name, or the tag without its @. */
export const avatarName = (displayName: string | null, tag: string): string => {
  const name = displayName?.trim();

  return name ? name : tag;
};

/** The link a person shares to invite someone: the join page of this site, with the invite's token. */
export const inviteUrl = (origin: string, token: string): string => {
  return `${origin.replace(/\/+$/, '')}/circles/join/${token}`;
};

/**
 * A friend's avatar in the shape the Avatar component draws. A photo avatar reaches friends as `initial` (the photo is
 * private to its owner for now); the Avatar shows the initial when it has no picture, so it is handed a bare Google one.
 */
export const toAvatarView = (avatar: FriendAvatar): AvatarView => {
  const { kind, value, color, url } = avatar;

  return kind === 'initial' ? { kind: 'google', value: null, color: null, url: null } : { kind, value, color, url };
};

/**
 * What a circle is called on screen: a group by its name, a pair by the partner (never the stored name, which is only
 * "Partners"). A pair still waiting for its partner has no name yet, and gives null.
 */
export const circleTitle = (circle: {
  kind: 'group' | 'pair';
  name: string;
  partnerName: string | null;
  partnerTag: string | null;
}): string | null => {
  const { kind, name, partnerName, partnerTag } = circle;

  if (kind === 'group') {
    return name;
  }

  return partnerTag === null ? null : memberName(partnerName, partnerTag);
};
