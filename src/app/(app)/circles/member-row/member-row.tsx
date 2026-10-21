import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/avatar/avatar';
import { Button } from '@/components/ui/button';
import { avatarName, memberName, toAvatarView } from '@/lib/circle-people';
import type { CircleMemberView } from '@/server/circles-view';
import './member-row.css';

interface MemberRowProps {
  member: CircleMemberView;
  /** Only the person who started the circle can remove someone, and never themselves. */
  canRemove: boolean;
  onRemove: (member: CircleMemberView) => void;
}

/** One person in a circle: their avatar, name and @tag, who they are to you, and a Remove button when you may. */
export const MemberRow = (props: MemberRowProps) => {
  const { member, canRemove, onRemove } = props;
  const { tag, displayName, isYou, isOwner, avatar } = member;

  const t = useTranslations('circles.circle');

  const name = memberName(displayName, tag);

  const onRemoveClick = () => {
    onRemove(member);
  };

  return (
    <li className="member-row">
      <Avatar avatar={toAvatarView(avatar)} name={avatarName(displayName, tag)} size="md" />
      <div className="member-row__body">
        <p className="member-row__name">{name}</p>
        {displayName?.trim() && <p className="member-row__tag">{`@${tag}`}</p>}
      </div>
      {isYou && <span className="member-row__badge">{t('you')}</span>}
      {isOwner && <span className="member-row__badge">{t('owner')}</span>}
      {canRemove && (
        <Button variant="outline" size="sm" aria-label={t('removeLabel', { who: name })} onClick={onRemoveClick}>
          {t('remove')}
        </Button>
      )}
    </li>
  );
};
