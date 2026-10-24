import { useTranslations } from 'next-intl';
import { ReactionBar } from '@/app/(app)/circles/reaction-bar/reaction-bar';
import { useReact } from '@/app/(app)/circles/use-circle-social';
import { Avatar } from '@/components/avatar/avatar';
import type { Reaction } from '@/domain/circles';
import type { FeedBubble } from '@/lib/circle-feed';
import { avatarName, memberName, toAvatarView } from '@/lib/circle-people';
import { cn } from '@/lib/utils';
import './bubble.css';

interface BubbleProps {
  circleId: string;
  bubble: FeedBubble;
  /** You: your id and tag, so a reaction of yours shows before the server answers. */
  me: { id: string; tag: string };
}

/** A friend's day as a message: their avatar, name, what they did, and the reactions it got. */
export const Bubble = (props: BubbleProps) => {
  const { circleId, bubble, me } = props;
  const { member, date, habits, reactions } = bubble;
  const { userId, tag, displayName, avatar, allowCheers, isYou } = member;
  const { id: meId, tag: meTag } = me;

  const t = useTranslations('circles.member');
  const tc = useTranslations('circles.circle');
  const react = useReact(circleId);

  const onToggle = (emoji: Reaction, on: boolean) => {
    react.mutate({ circleId, toUser: userId, forDate: date, emoji, on, me: meId, myTag: meTag });
  };

  return (
    <li className={cn('bubble', isYou && 'bubble--mine')}>
      <Avatar avatar={toAvatarView(avatar)} name={avatarName(displayName, tag)} size="md" />
      <div className="bubble__body">
        <p className="bubble__who">{isYou ? tc('you') : memberName(displayName, tag)}</p>
        <div className="bubble__card">
          <ul className="bubble__habits">
            {habits.map(({ name, icon, streak }, index) => {
              const { unit, count } = streak ?? { unit: 'day', count: 0 };

              return (
                <li key={index} className="bubble__habit">
                  {icon && <span aria-hidden="true">{icon}</span>}
                  <span className="bubble__habit-name">{name ?? (icon ? '' : t('aHabit'))}</span>
                  {streak && (
                    <span className="bubble__streak">
                      {unit === 'week' ? t('streakWeeks', { count }) : t('streakDays', { count })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <ReactionBar reactions={reactions} enabled={allowCheers && !isYou} onToggle={onToggle} />
      </div>
    </li>
  );
};
