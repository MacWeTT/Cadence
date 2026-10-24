import { Check, SmilePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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

interface BubbleState {
  picking: boolean;
}

/**
 * A friend's day as a message: their avatar, name and what they did, a small button beside it to react, and the
 * reactions it got underneath. Your own day has no button, because nobody reacts to themselves.
 */
export const Bubble = (props: BubbleProps) => {
  const { circleId, bubble, me } = props;
  const { member, date, habits, off, reactions } = bubble;
  const { userId, tag, displayName, avatar, allowCheers, isYou } = member;
  const { id: meId, tag: meTag } = me;

  const [state, setState] = useState<BubbleState>({ picking: false });

  const t = useTranslations('circles.member');
  const tc = useTranslations('circles.circle');
  const tr = useTranslations('circles.conversation');
  const react = useReact(circleId);

  const { picking } = state;
  const enabled = allowCheers && !isYou;

  const onToggle = (emoji: Reaction, on: boolean) => {
    react.mutate({ circleId, toUser: userId, forDate: date, emoji, on, me: meId, myTag: meTag });
  };

  const onPickClick = () => {
    setState({ picking: !picking });
  };

  const onPicked = () => {
    setState({ picking: false });
  };

  return (
    <li className={cn('bubble', isYou && 'bubble--mine')}>
      <Avatar avatar={toAvatarView(avatar)} name={avatarName(displayName, tag)} size="md" />
      <div className="bubble__body">
        <p className="bubble__who">{isYou ? tc('you') : memberName(displayName, tag)}</p>
        <div className="bubble__line">
          <div className="bubble__card">
            <ul className="bubble__habits">
              {habits.map(({ name, icon, streak }, index) => {
                const { unit, count } = streak ?? { unit: 'day', count: 0 };

                return (
                  <li key={index} className="bubble__habit">
                    <span className="bubble__check">
                      <Check aria-hidden="true" className="bubble__check-icon" />
                      <span className="sr-only">{t('done')}</span>
                    </span>
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
            {off.length > 0 && (
              <p className="bubble__off">
                {t('offDays', {
                  names: off
                    .map(({ name, icon }) => {
                      return name ?? icon ?? t('aHabit');
                    })
                    .join(', '),
                })}
              </p>
            )}
          </div>
          {enabled && (
            <button
              type="button"
              aria-label={tr('addReaction')}
              aria-expanded={picking}
              onClick={onPickClick}
              className="bubble__add"
            >
              <SmilePlus aria-hidden="true" className="bubble__add-icon" />
            </button>
          )}
        </div>
        <ReactionBar
          reactions={reactions}
          enabled={enabled}
          picking={picking}
          onToggle={onToggle}
          onPicked={onPicked}
        />
      </div>
    </li>
  );
};
